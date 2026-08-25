# Backend architecture

How `apps/api` is put together, and why. `CLAUDE.md` states the rules; this explains them,
so that changing one is a decision rather than an accident.

## The shape

One folder per bounded context, plus `shared/`. Inside a context, four layers and three
roots:

```
src/dns/
  dns.config.ts      the config shape this context reads
  dns.module.ts      the object graph — use cases, no transport
  dns.app.ts         the Elysia plugin
  domain/            types, pure functions, port definitions
  application/       use cases and queries
  api/               route factories and wire schemas
  infra/             adapters implementing the ports
```

`src/app.ts` is the only file that mounts contexts onto a server.

The split between `dns.module.ts` and `dns.app.ts` is the one that repays attention.
`dns.module.ts` imports no Elysia, which means a context can be driven by something that
is not HTTP. The verification flow in the PRD runs on Inngest: a durable function that
reads a zone on a schedule, with no request anywhere. It imports the module and calls the
use case. If the module returned an Elysia instance instead, that function would have to
either re-wire the whole graph or pull a service out of `decorate` — a service locator,
which Elysia's own documentation advises against.

## A context publishes a language

Contexts used to be forbidden from importing each other at all, which sounds strict and is
not. The arrows are real — `verification` needs to know a zone's nameservers and how long a
denial stays cached, because three of the thirteen probes are statements about the zone
rather than about the record. Forbidding the import does not delete that dependency; it
moves it into `src/app.ts`, where the translation happens without anyone calling it
translation, and where nothing stops a caller from passing another context's internals
around.

So the rule is not "no arrows". It is "declared arrows, through a published surface":

```ts
const CONTEXT_MAP: Record<string, readonly string[]> = {
  zones: [],
  verification: ["zones"],
  domains: ["verification"],
  proof: ["domains"],
}
```

`zones.contract.ts` is what `verification` may pronounce about a zone, and it is smaller
than `Zone` on purpose — nameservers, the zone name, and whether the authority answered.
No provider, no `observedAt`, no cache. The aggregate stays free to change shape while the
sentence other contexts speak stays still.

The downstream side owns the translation. `verification` declares `ReadZoneFacts` in its
own words — `answering`, `silent`, `unknown` — and adapts the contract onto it. That is an
anti-corruption layer, and while the translation is a handful of lines it lives at the
composition root; the day it grows it becomes `verification/infra/zone-facts.ts` and
nothing else moves, because the published surface already exists.

### Why not `shared/`

The tempting alternative was to lift `DnsAnswer`, `SoaRecord` and the DoH client into
`shared/` and let both contexts read DNS from one place. It fails on a distinction worth
naming: `shared/` holds what two contexts need with **one meaning**. `DomainName` parses
the same name for everybody. A DNS answer does not — for `zones` it is "what a zone read
saw", cached in Postgres under a TTL, resolved first-answer-wins; for `verification` it is
"what three resolvers each said about one host", never cached, where the disagreement
between them *is* the propagation information. Same words, different questions.

Working the probes backwards settles it. What they actually read is TXT values, whether a
host was absent or merely typeless, a CNAME target, two small enums and two numbers — no
foreign vocabulary at all. Even the negative-cache seconds arrive as a number through the
port, so `verification` never parses an SOA record. Nothing needed sharing; one side needed
to publish.

## Functional and typed first

Data is plain `readonly` types. Behaviour is pure functions over that data. Nothing is
`new`ed except adapters. The value of this is not aesthetic: the types are what the wire
and the database already hold, so nothing needs constructing on the way in or out.

### Illegal states are unrepresentable

The product rests on one rule (PRD §2, the third outcome): our failure to reach DNS must
never read as a statement about someone's domain. A resolver timing out is not the same
fact as a domain not existing, and conflating them tells a person their zone is broken
when it is ours that is.

An earlier version encoded that as a flat status plus a helper:

```ts
type DnsStatus = "NOERROR" | "NXDOMAIN" | "SERVFAIL" | "REFUSED" | "TIMEOUT" | "NETWORK_ERROR"
if (isAnswerAboutTheZone(answer.status)) { ... }
```

Which works exactly as long as everybody remembers to call it. The tagged union does not
depend on memory:

```ts
type DnsAnswer =
  | { type: "answered"; status: "NOERROR" | "NXDOMAIN"; records: readonly DnsRecord[] }
  | { type: "failed"; reason: "SERVFAIL" | "REFUSED" | "TIMEOUT" | "NETWORK_ERROR" }
```

There is no `.records` on a lookup that failed. The compiler enforces the product rule.

The same move appears twice more. `Delegation` carries `readonly [string, ...string[]]`, so
"delegated with zero nameservers" cannot be built. `PublishingEstimate` is a variant rather
than a nullable number, so a caller cannot render an unknown wait as zero minutes.

Reach for this whenever a nullable field and a boolean flag are travelling together — that
pairing is almost always a union wearing a disguise.

### Errors are values

Use cases return `Result<T, E>` with a tagged `E`. Nothing throws for a condition the
caller is expected to handle. The HTTP layer maps the union with an exhaustive `switch`
closed by `unreachable(error)`, so adding a failure mode breaks the build until someone
decides what status code it deserves.

## Dependencies

There is no DI container. A use case takes its dependencies once and returns a handler:

```ts
export function createReadZone(deps: ReadZoneDeps): ReadZone {
  return async (input) => { ... }
}
```

Dependencies live in the closure. Call sites pass only the request: `readZone({ name })`.
Nothing threads a `deps` bag downward, which is the problem a container is usually reached
for in the first place.

### Why not a container

InversifyJS was wired up and then removed. Three reasons, in ascending order of weight:

**It solves a problem already solved.** What removes dependency threading is applying
dependencies once — a closure or a constructor. The container only writes the `new` calls,
and in exchange every interface needs a runtime token, which is a second naming system
running alongside the type system.

**Wiring errors move from compile time to run time.** `createDnsModule` is checked by
`tsc`. A missing binding is found when someone calls `container.get`.

**It makes tests worse, not better.** Decorators are inert under `new`, so a unit test that
constructs its subject gets nothing from the container. Building one instead means an async
helper and `unbind`/`bind` gymnastics for each seam. Worse, a module's baked-in defaults win
silently: a test can declare its own fixtures, never rebind the adapter that reads them, and
pass anyway. That was reproduced on this codebase before the decision was made.

Every module factory takes an `overrides` parameter typed against its ports. That covers
the one thing a container is genuinely good at — a whole app wired real with one adapter
swapped — and `tsc` checks it.

If the domain ever grows enough to want typed effects and structured interruption,
Effect-TS is the honest next step, not a container. It is a much larger commitment than
what was removed, and it should be a deliberate migration.

## Elysia

Elysia has its own notion of "dependency", and it is not object construction. An Elysia
instance depends on another instance so that its `decorate`, `derive`, `macro`, `model` and
hooks come into scope with their types; `.use()` declares it and `name` deduplicates it. It
is about type propagation and request lifecycle.

The two systems meet only at a route factory, and the rules that follow are in `CLAUDE.md`.
The two worth understanding rather than obeying:

**Never break the method chain.** Elysia returns a new type from every method, and the
front end reads route types straight off the server through Eden Treaty with no codegen.
A broken chain silently degrades the types the web app compiles against.

**Per-request values are Elysia's job.** Session, `requestIP`, anything derived from the
request belongs in `derive`/`resolve`/`macro`. Inventing a parallel request scope in the
composition layer is the one way to make these two systems genuinely conflict.

One practical note that costs an hour if unknown: `app.handle()` needs a real host.
`new Request("http://x/api/health")` returns 404; `http://localhost/api/health` works.

## What enforces what

Prose does not enforce anything. This is what actually bites:

| Rule | Enforced by |
| --- | --- |
| Layer boundaries, module/app split, contexts not importing each other | `test/architecture.test.ts` |
| No explanatory comments, no classes, no throwing in domain/application | `test/conventions.test.ts` |
| Every route documents a response schema per status | `test/conventions.test.ts` |
| No `any`, no `!`, bounded complexity, no barrel files | Biome override on `apps/api/**` |
| All of the above, on every edit | `.claude/hooks/check-api.sh` |
| Everything else | `CLAUDE.md`, and review |

Each guard test was verified by planting a violation and watching it fail. A guard that has
never failed is not known to work.

When a guard fires, move the code. Widening the rule to fit the code is how an architecture
document becomes fiction.
