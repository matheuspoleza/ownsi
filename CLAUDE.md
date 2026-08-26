# ownsi

The reasoning behind the API rules below is in
[`docs/backend-architecture.md`](docs/backend-architecture.md). Read it before changing one.

Bun workspaces + Turborepo. `apps/api` (Elysia), `apps/web` (React + Vite on Cloudflare),
`apps/docs` (Mintlify), `packages/{db,emails,sdk,ui,tsconfig}`. The product spec is
`docs/domain-ownership/prd.md`.

## Comments

Code carries no explanatory comments. A comment is a bug report against a name: if a
line needs prose to be understood, rename the thing or extract a function until it does
not. No section banners, no restating the code in English, no `// TODO(D4)` markers.

The exceptions, and they are the only ones:

- A JSDoc line on a published type when it changes what a caller passes.
- A reference to an external contract that cannot be inferred from the code — an RFC
  number, a vendor quirk, the reason a workaround exists.

Prefer encoding the reason in a name. `negativeCacheTtlSeconds` needs no comment about
RFC 2308; `soaMinimum` would.

Everything is written in English, including commit messages.

## API architecture

`apps/api/src` is one folder per bounded context, plus `shared/`. Inside a context:

| folder         | holds                                              | may import              |
| -------------- | -------------------------------------------------- | ----------------------- |
| `domain/`      | types, pure functions, port definitions            | `shared/`, own `domain/`|
| `application/` | use cases and queries, as closures over their deps | `domain/`, `shared/`    |
| `api/`         | Elysia route factories and wire schemas            | `application/`, `shared/`|
| `infra/`       | adapters that implement the ports                  | `domain/`, `shared/`    |

Up to four files sit at the root of a context and carry the wiring:

| file                    | holds                                                    |
| ----------------------- | -------------------------------------------------------- |
| `<context>.module.ts`   | the object graph — use cases, no transport                |
| `<context>.app.ts`      | the Elysia plugin mounting the context's routes           |
| `<context>.config.ts`   | the config shape the context reads, when there is any     |
| `<context>.contract.ts` | the language other contexts may speak about this one      |

`module` and `app` are always there. `domains` has no config because it has nothing to
configure; `auth` has no contract because nothing reaches it along an arrow.

The split is load-bearing. `*.module.ts` imports no Elysia, so a context can be driven by
something other than HTTP: `verification.verifyUntilDeadline` is driven by an Inngest durable
function with no request in sight, and must never pull a service out of an Elysia instance to
get it.
`*.app.ts` is where context-level `model()` and `onError` belong as the context grows.

`src/app.ts` is the only file that wires contexts into a server.

`test/architecture.test.ts` enforces every boundary above, including the module/app split,
and fails the build on a violation.

A context reaches another only through `<other>/<other>.contract.ts`, and only along an arrow
declared in `CONTEXT_MAP` in `test/architecture.test.ts` — the map is asserted, cycles included.
The contract is a published language: deliberately narrower than the domain behind it, and the
only file of a context that anything outside it may import.

`shared/` is for something else — what two contexts need with the *same meaning* **and no owner**:
`DomainName`, `Result`, the clock, the email transport. Ownership is the test, not popularity: the diagnosis vocabulary is
read by three contexts and published on the public docs, and it still belongs to `verification`,
because only `verification` constructs one. A type that means one thing to one context and another to
its neighbour is not shared either; it is published on one side and translated on the other.
The reasoning is in
[`docs/backend-architecture.md`](docs/backend-architecture.md#a-context-publishes-a-language).

### Naming

Names come from the business, never from the machinery. Three rules, and a suffix that says
which kind of thing a file holds. The reasoning is in
[`docs/backend-architecture.md`](docs/backend-architecture.md#naming-is-the-architecture).

**The verbs are a closed set.** Queries are `get<Thing>` (one, by id, scoped to the caller),
`list<Things>` (many, always scoped) and `findOrCreate<Thing>` (idempotent on a natural key —
the only compound verb). Commands take one imperative verb from `create`, `cancel`, `archive`,
`delete`, `run`, `stop`, `revoke`, `prove`, `expire`, `notify`. Events are `<Entity><Verb>ed`,
derived from the command that caused them: `ClaimCreated`, never `ClaimIssued`.

An act that wants a verb outside the set is usually two acts. Widening the set is a decision;
reaching for `apply`, `request`, `announce`, `handle` or `process` is not.

**One name, in four places.** The file, the type, the function and the module property carry the
same word:

```ts
// claims/application/create-claim.use-case.ts
export type CreateClaim = (input: CreateClaimInput) => Promise<Result<ClaimView, CreateClaimError>>
export function createClaim(deps: CreateClaimDeps): CreateClaim { ... }

// claims.module.ts
return { createClaim: createClaim(deps) }
```

That the function closes over its dependencies is the pattern, not the noun, so it never appears
in the name. There is no `create*`/`make*` factory prefix in `application/` — `infra/` already
names adapters this way (`postgresDomainRepository`, `dohTxtLookup`), and dropping the prefix is
what frees `create` to mean the business act. `create` in a name means creating something, or
constructing an adapter instance (`createDatabase`, `createAuth`). It never means "returns a
closure".

**One file, one unit.** One use case per file, one query per file, one schedule per file. The
filename *is* its name, so two of them in one file means one of them has no name. Its own input,
deps and error types travel with it; nothing else does. A type invented to cover several use
cases at once — because they share a signature rather than a meaning — is the smell this rule
removes.

**The suffix says the role.** Same move `apps/web` makes with `.page.tsx` and `.route.tsx`, and
it makes the system greppable: `ls **/*.use-case.ts` is every act the product performs.

| folder | suffix | holds |
| --- | --- | --- |
| `domain/` | none | pure types and functions; the folder already says it |
| `application/` | `.use-case.ts` | a command — writes, returns `Result` |
| | `.query.ts` | a read — never writes |
| | `.schedule.ts` | a use case that runs on its own clock, not on a request |
| `api/` | `.routes.ts` `.response.ts` `.errors.ts` | wire shapes and Elysia factories |
| `infra/` | `.repository.ts` | persistence for one aggregate |
| | `.service.ts` | every other adapter — DNS, email, the scheduler |
| | none | recorded data a fake reads, which implements no port |
| root | `.module.ts` `.app.ts` `.config.ts` `.contract.ts` | the wiring |

A `.schedule.ts` takes its clock as a port, so `application/` holds no scheduler framework and a
seven-day expiry is testable in a millisecond against a fake.

**A reaction to an event is an ordinary use case.** Nothing is named `on<Event>` and no file is a
subscriber. When a policy — "whenever X happens, do Y" — is unconditional, the rule is one line
in `src/app.ts` binding a topic to a use case anyone can call directly. A `.policy.ts` is earned
only by a reaction that carries a real condition of its own.

### Auth is a context; the HTTP session is not

Authenticating someone is a domain — better-auth, the magic link, Google, the user record —
and it has an owner, so it is a context like any other. Asking "who is this" on a request is
not: it is transport, every context does it, and none of them cares how the answer was reached.
The two are split accordingly:

| file | holds |
| --- | --- |
| `auth/infra/better-auth.service.ts` | `createAuth` — the configured instance — and `createCheckSession` |
| `auth/infra/magic-link.service.ts` | `SendMagicLink`: renders the template, hands it to `shared/email.ts` |
| `auth/auth.module.ts` | the graph: the handler and a `CheckSession`, no Elysia |
| `auth/auth.app.ts` | the plugin that mounts better-auth under its base path |
| `shared/http/session.ts` | `SessionCheck`, and the Elysia macro a route opts into with `session: true` |

`SessionCheck` stays in `shared/http/` on purpose, and it is the one place the ownership test
is answered by transport rather than by domain. The macro is an Elysia plugin, so it can never
live in `auth.contract.ts`, which may not import Elysia; and a context's `*.app.ts` may not
import another context's `api/`. Leaving the check where every route already reaches it is what
keeps the guards honest instead of widened. `auth/` produces one; `shared/http/` describes the
handoff and the 401.

Three rules survive, and they are the point:

- Nothing outside `auth/` imports `better-auth`. Contexts read `SessionCheck`, a tagged union,
  so no handler can reach a user off a check that came back anonymous.
- The macro is opt-in per route. `GET /api/zones/:name` is a logged-out visitor's first
  impression and must stay that way (PRD §3.7).
- `auth.module.ts` imports no Elysia, so the day a second runtime needs the instance — Inngest
  out of process — it calls the module and mounts nothing.

Wrapping better-auth's own API buys nothing and is not done: `Auth` is republished from the
module because `apps/web` infers its client off that type.

### Functional and typed first

Data is plain `readonly` types, never classes. Behaviour is pure functions that take the
data. Nothing is `new`ed except adapters.

Model outcomes as tagged unions so illegal states cannot be constructed. `DnsAnswer` is
`{ type: "answered", records }` or `{ type: "failed", reason }` precisely so no caller can
read records off a lookup that failed — that rule is the product's central promise
(PRD §2, the third outcome) and it is the type system's job, not the reviewer's.

Errors are values. Return `Result<T, E>` with a tagged `E`; do not throw for anything a
caller is expected to handle. Map unions with an exhaustive `switch` closed by
`unreachable(value)` from `shared/result.ts`, so a new variant breaks the build.

### Dependencies

No DI container. A use case is a function that takes its dependencies once and returns
the handler:

```ts
export function createReadZone(deps: ReadZoneDeps): ReadZone {
  return async (input) => { ... }
}
```

Dependencies are applied at composition time and live in the closure. Never thread a
`deps` bag through call sites, and never reach for a service locator.

Ports are function types or small objects of function types, defined in `domain/ports.ts`
and implemented in `infra/`. A single-operation port is a bare function type, so a fake
is one line.

Every module factory takes an `overrides` parameter typed against its ports. That is how
tests swap adapters — checked by `tsc`, unlike a container rebind.

### Elysia

Elysia's own "dependency" is plugin composition, not object construction; the two systems
meet only at a route factory. Rules that follow from that:

- One Elysia instance per controller, built by a `*.routes.ts` factory that takes the use
  case as a plain argument.
- Never break the method chain — Eden Treaty's types on the front end depend on it.
- Never pass `Context` into a function outside `api/`. Destructure what you need.
- `decorate` is for request-scoped values only (`requestIP`, session), never for services.
- Per-request dependencies are Elysia's job: `derive`, `resolve`, `macro`. Never invent a
  parallel request scope.
- Give every plugin a `name` so mounting it twice deduplicates.
- `app.handle()` needs a real host: `new Request("http://localhost/api/...")`. A bare
  `http://x/` returns 404.

## Web architecture

`apps/web/src` is organised by feature, not by layer. A file lives with its only consumer:

```
src/
  main.tsx  router.tsx  Root.route.tsx
  api/            everything that talks to the server
  components/     components used by more than one page
  hooks/          hooks used by more than one page
  lib/            pure helpers and their constants
  pages/Claim/    Claim.page.tsx  Claim.route.tsx  Claim.utils.ts
                  components/  hooks/     private to this page
```

One consumer means the page folder; two means it moves up. A page never imports another
page's private files, and nothing under `components/`, `hooks/`, `lib/` or `api/` ever
imports from `pages/`.

Every file names its job: `.component.tsx`, `.page.tsx`, `.modal.tsx`, `.route.tsx`,
`.api.ts`, `.client.ts`, `.utils.ts`, `.constants.ts`, and `use*.ts` for a hook. PascalCase
means the file is a component or belongs to one (`VantageField.constants.ts`); camelCase
means it stands alone (`domain.utils.ts`). No barrel files.

Components are arrow consts with a named, exported props interface — always, including
one-prop components. No `React.FC`. `function` is for recursion, not for components.

Pages orchestrate: they read the URL, call hooks and lay out the result. Business logic
lives in hooks named `use[Entity]State`, `use[Entity][Action]` or `use[Entity]Subscription`.
A `useQuery` or a `useMutation` written inline in a page belongs in one.

Styling is Tailwind utilities on the element, over the tokens in
`packages/ui/src/styles/theme.css`. There is no `.css.ts`; a component with real variants
gets `cva`, in `packages/ui`. `packages/ui` keeps shadcn's kebab-case layout so the CLI
keeps working — the naming rules above are for application code.

`api/` is the only place that knows a server exists, and what it holds is one line:
`createOwnsi({ baseUrl: window.location.origin })` from `@ownsi/sdk`. The SDK is typed off the
API's exported `App` type, so a changed route is a type error here rather than a runtime
surprise. A `*.api.ts` binds the SDK to what a page needs; a page never builds a client.

The rules above are read, not asserted — the `web-conventions` skill is the pass to run over
a diff. Biome and `tsc` still fail the build on `any`, `!`, unused code, barrel files and a
props shape that does not match.

`docs/frontend-architecture.md` explains the reasoning.

## Published documentation

`apps/docs` is the public site, on Mintlify. MDX pages plus a `docs.json` that carries the whole
navigation. Its own rules are in [`apps/docs/README.md`](apps/docs/README.md); these are the ones
that reach back into the code.

**Two files in `apps/docs` are generated and committed. Never edit them by hand:**

| Generated file | Comes from |
| --- | --- |
| `api-reference/openapi.json` | the running Elysia app, via `/openapi/json` |
| `diagnostics/catalogue.mdx` | `explain()` in `apps/api/src/verification/domain/diagnosis.ts` |

`apps/api/scripts/emit-docs.ts` writes both; `bun run docs:emit` runs it. `apps/api/test/docs.test.ts`
fails when either drifts from the code, so a route change without a regenerate does not merge.

That direction is the whole point: **the API owns its contract and the docs read it.** A page never
restates a schema or a diagnosis sentence in prose — it links to the generated one. Adding an
endpoint means adding the route with its `response` schemas and a `detail: { tags, summary,
description }`, then regenerating; there is no page to write.

`errors.mdx` sits at the docs root because `errorResponse()` builds `docsUrl` as
`https://docs.ownsi.dev/errors#<code>`. Moving it breaks every error the API has ever returned. Every
code passed to `errorResponse()` must have a `## <code>` heading there, and the test checks it.

Prose pages are hand-written and follow the same voice as the rest of the repo: name the true
thing, show the failure next to the success, no "simply" and no "just".

## Testing

`bun test` in `apps/api`. Tests construct their subject directly and pass fakes as
arguments; there is no test container and no module mocking.

Fixtures live in the test file that uses them. A test must not depend on a default baked
into a module factory — if it does, the test can pass while ignoring its own setup.
`test/harness.ts` builds the whole app with in-memory adapters and a faked session, which is
how a route is tested; `test/flow.test.ts` runs a name to a proof over HTTP through it.

`apps/web` has no test task at all today. Hooks are the first thing worth covering there,
and they need no DOM — adding the first one is what puts `test` back in its `package.json`.
`apps/docs` runs only its conventions guard, which is all a package of MDX has to prove.

## What enforces what

| Rule | Enforced by |
| --- | --- |
| Layer boundaries, module/app split, context isolation | `apps/api/test/architecture.test.ts` |
| Comments, classes, throwing, the verb set, one unit per file, the suffixes | the rules above, and the `api-conventions` skill |
| Every route documents a response schema per status | the same, and `apps/api/test/docs.test.ts` on the emitted document |
| No `any`, no `!`, bounded complexity, no barrel files | Biome override on `apps/api/**` |
| Web naming, colocation, arrow components, named props, no comments | the rules above, and the `web-conventions` skill |
| No `any`, no `!`, unused code, no barrel files, hook dependencies | Biome, on `apps/web/**` |
| The published docs match the code they document | `apps/api/test/docs.test.ts` |
| Every route written in prose is one the API still serves | `apps/docs/test/routes.test.ts` |
| Every route the API publishes is reached by the SDK, or waived | `packages/sdk/test/coverage.test.ts` |
| Every docs page is navigated, has frontmatter and links somewhere real | `apps/docs/test/conventions.test.ts` |
| All of the above, on every edit | `.claude/hooks/check-api.sh`, `.claude/hooks/check-web.sh` |

When a guard fires, move the code. Do not widen the rule.

## Commands

```
bun run infra:up   # postgres and the inngest dev server
bun run dev        # turbo: api + web
bun run dev:docs   # mintlify on :3000, after regenerating what is generated
bun run docs:emit  # regenerate openapi.json and the diagnostics catalogue
bun run typecheck
bun run lint       # biome
cd apps/api && bun test
cd apps/web && bun test
cd packages/db && bun run db:migrate
```

The context still to build is `proof`. What it owes is in the PRD, not in the codebase.

Two things `apps/api` does not enforce with a test, on purpose:

- **The conventions above are read, not asserted.** `apps/api/test/conventions.test.ts` and
  `apps/web/test/conventions.test.ts` both scanned for them, and both were deleted; the rules
  live here and in the `api-conventions` and `web-conventions` skills instead. A guard that
  greps for `//` cannot tell a comment that earns its place from one that does not, and the
  naming rules are judgements. `apps/api/test/architecture.test.ts` still asserts every
  boundary, because a boundary is a fact and not a judgement.
- **Coexistence reads across a table it does not own.** `claims/infra/coexistence.repository.ts`
  joins `Domain` and `User`, because "is anyone else claiming this name" is a question about
  names and about people, and neither belongs to `claims`. It is the one read that crosses,
  it is a read, and it is named so the next person finds it.
