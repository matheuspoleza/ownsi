# @ownsi/api

Bun + Elysia. Reads DNS, keeps claims, serves the proof pages.

The rules for working here are in [`CLAUDE.md`](../../CLAUDE.md); the reasoning behind them
is in [`docs/backend-architecture.md`](../../docs/backend-architecture.md). This file is
the map.

## Map

```
src/
  app.ts             mounts every context onto one server; the only place that does
  config.ts          environment in, typed config out

  auth/              authenticating someone: better-auth, the magic link, Google
    auth.config.ts     the config this context reads
    auth.module.ts     the object graph — the handler and a CheckSession, no Elysia
    auth.app.ts        the Elysia plugin mounting better-auth under its base path
    domain/            SendMagicLink, the one port
    infra/             adapters: the better-auth instance, Resend and the log driver

  zones/             reading a zone: nameservers, provider, publishing estimate
    zones.config.ts    the config this context reads
    zones.module.ts    the object graph — use cases, no transport
    zones.app.ts       the Elysia plugin
    zones.contract.ts  the language another context may speak about a zone
    domain/            types, pure functions, port definitions
    application/       use cases and queries
    api/               route factories and wire schemas
    infra/             adapters: DoH, UDP/53, Postgres, recorded fakes

  domains/           a domain on an account: the token, the state, the lifecycle
    domains.config.ts  the config this context reads
    domains.module.ts  the object graph — use cases, no transport
    domains.app.ts     the Elysia plugin
    domain/            Domain, Claim, the one-way lifecycle, and the status it
                       derives from a diagnosis it does not own
    application/       use cases and queries
    api/               route factories and wire schemas
    infra/             adapters: the Postgres store, the coexistence query, the demo
                       catalogue, the token, the anti-corruption layer over
                       verification, the Inngest watcher that is the claim's clock,
                       the notice emails and the log that keeps them under the ceiling

  verification/      did this token appear at this host, and if not, which failure is it
    verification.config.ts    the config this context reads
    verification.module.ts    the object graph — use cases, no transport
    verification.contract.ts  what domains may speak: the diagnosis vocabulary and
                       the check it can ask for — and none of the observation,
                       the quorum or the probes
    domain/            diagnosis.ts holds the 13 codes and the cause and fix each one
                       reads as; attempt.ts the three outcomes; methods/txt/ the
                       reduced observation, the quorum of three, and the probes
    application/       check-challenge.ts dispatches on the method and owns no DNS
                       of its own; txt-method.ts is the one method there is —
                       collect, then diagnose, and the authority is asked only
                       once the recursive answer came back negative
    infra/             adapters: DoH over three resolvers, UDP/53 to the zone's own
                       nameservers, the anti-corruption layer over zones, the fake

  shared/            what more than one context needs
    http/              error shape, the health route, and the session macro every
                       context opts into — the handoff, not the authenticating
    clock.ts           injected so tests state the time instead of waiting for it
    email.ts           one Resend, one `log` driver, one `SendEmail` — no context owns it
    inngest.ts         the durable clock's client, built like the database is
    result.ts          Result, and the exhaustiveness guard for tagged unions
    identifiers.ts     randomId — a prefixed id, and no opinion about what it names
    domain-name.ts     parse, normalise, punycode and the public suffix list — and
                       nothing that decides anything

scripts/
  emit-docs.ts       writes apps/docs' openapi.json and diagnostics catalogue

test/
  architecture.test.ts   layer boundaries; fails the build when one is crossed
  conventions.test.ts    comments, classes, throwing, response schemas
  docs.test.ts           the emitted documentation still matches the code
  auth/, zones/,         each context's own tests
  domains/,
  verification/
```

## Where does it go

| Writing | Goes in |
| --- | --- |
| A type, or a function over that type with no I/O | `<context>/domain/` |
| An interface to the outside world | `<context>/domain/ports.ts` |
| A use case or query | `<context>/application/`, as `create<Name>(deps)` |
| Something that talks to a vendor, a driver, the network | `<context>/infra/` |
| An HTTP route | `<context>/api/<thing>.routes.ts` |
| Wiring a context together | `<context>/<context>.module.ts` |
| Mounting a context's routes | `<context>/<context>.app.ts` |
| Something two contexts need, with one meaning for both | `shared/` |
| What another context may know about this one | `<context>/<context>.contract.ts` |
| Authenticating someone | `auth/` |
| Asking who is on a request | `shared/http/session.ts`, the macro every route opts into |

`domains` keeps its records in Postgres: a `Domain` row per name per account, and a `Claim` row
per attempt at it, ordered by `sequence` — the highest is the one in play and the rest are
history. Nothing is kept in memory; a claim survives a restart, which is the whole point of a
seven-day window.

Inngest is the clock, not an orchestrator. Opening a claim sends one event; one durable function
per claim then alternates `step.sleepUntil(nextCheckAt)` with `checkWhenDue`, which runs the same
attempt the *check now* button runs. The function ends when `checkWhenDue` answers `null`, so
cancelling, archiving or proving a claim needs no cancellation: the next wake finds no open claim
and stops. A check that wakes past `expiresAt` expires the claim instead of checking it, which is
why expiry needs no sweeper of its own.

The interval is derived, not guessed: 30 s while the claim is minutes old, widening to 6 h after a
day, and never sooner than the SOA MINIMUM says resolvers will forget the "does not exist".
Roughly sixty checks over the seven-day window. `unresolvable` moves nothing except
`consecutiveFailures`, which doubles the wait up to a ceiling — a resolver outage costs the claim
nothing and says nothing.

A check that changes something says so, once. `applyAttempt` returns the notices as data next to
the new claim, so "a resolver outage sends zero emails" is an assertion over an array with no SMTP
in sight. There are four, and each is a state change rather than a repetition:

| Notice | When |
| --- | --- |
| `proved` | the record was there |
| `nudge` | the claim crossed day one, and again day three, still unresolved |
| `expiring` | the claim crossed day six — one warning, naming the fix that is outstanding |
| `coexistence` | somebody else proved a name you are still claiming |

Nudges and the warning come from crossing a boundary between two checks, not from a counter: if
the previous check was before day one and this one is after, it crossed, and it crosses once.
On top of that `announceOncePerDay` holds the PRD's ceiling — at most one email per claim per
notice per 24 hours — against `SentNotice` rows. Expiry itself sends nothing: day six already said
it, and a second email would only scold.

`DOMAINS_DRIVER=demo` changes one thing: claiming a name from `domains/infra/demo.ts` opens with
the history that screen is meant to show, so the front end can be built against real Eden types
without hand-fabricating six states. It writes to the same Postgres as any other claim.

Contexts still to build: `proof`. What it owes is in
[the PRD](../../docs/domain-ownership/prd.md); commit `` has the pre-refactor sketch.

Auth is not among them: it is built. Authenticating is a domain with an owner; asking who is on
a request is transport. The reasoning for that split is in
[`CLAUDE.md`](../../CLAUDE.md#auth-is-a-context-the-http-session-is-not).

A context reaches another only through `<other>/<other>.contract.ts`, and only along an arrow
declared in `CONTEXT_MAP` in `test/architecture.test.ts` — today `verification → zones` and
`domains → verification`. The
contract is a published language, deliberately narrower than the domain behind it: `ZoneDescription`
carries nameservers and whether the authority answered, and none of `Zone`, its provider or its
`observedAt`. Everything else in a context stays private to it, `domain/` imports nothing that
reaches the world, and the same test enforces all of it, cycles included.

## Adding an endpoint

Run the `api-bounded-context` skill, or follow
[`.claude/skills/api-bounded-context/SKILL.md`](../../.claude/skills/api-bounded-context/SKILL.md).

Give it a `detail: { tags, summary, description }` alongside its schemas, then run
`bun run docs:emit`. The endpoint's page on [the public site](../docs/README.md) is generated from
that — parameters, schemas, playground, code samples — and `test/docs.test.ts` fails if you skip
the regenerate.

## Commands

```sh
bun run dev         # watch mode, reads ../../.env
bun test            # everything under test/
bun run typecheck
bun run lint
bun run docs:emit   # rewrite apps/docs' openapi.json and diagnostics catalogue
```

The OpenAPI document is at `/openapi` while `dev` is running, as JSON at `/openapi/json`.
It is generated from the same schemas the routes validate against, so there is no second
source of truth for the contract.

`scripts/emit-docs.ts` writes that same document into `apps/docs`, alongside a diagnostics
catalogue rendered from `explain()`. Both are committed, because Mintlify deploys from git;
`test/docs.test.ts` fails when either drifts, so the published reference cannot describe a
version of this API that no longer exists.

The front end does not read that document. It imports the `App` type from `src/index.ts`
and hands it to Eden Treaty, which turns the route tree into a typed client with no codegen
and no generated files to keep in sync — a renamed route or a changed response is a type
error in `apps/web`, not a runtime surprise. `verbatimModuleSyntax` erases the import, so
none of this reaches the browser bundle.

## Deploying

Railway builds `apps/api/Dockerfile` from the monorepo root; `railway.json` at the root
pins the builder, the healthcheck at `/api/health` and a pre-deploy `prisma migrate deploy`.
The Cloudflare Worker in `apps/web` proxies `/api/*` and `/p/*` to it, so the browser only
ever talks to one origin.

Railway is not interchangeable here. Authoritative queries go out over UDP/53 to the zone's
own nameservers, which is what separates "your provider has not published it" from "the
negative cache has not expired" — a recursive resolver cannot tell you that. Leave App
Sleeping off: this endpoint is a logged-out visitor's first impression, and it is not a
setting `railway.json` can hold.

## Endpoints

| Route | Auth | Notes |
| --- | --- | --- |
| `GET /api/zones/:name` | none | Public zone read. Rate limited at the Cloudflare edge, cached in Postgres under the name that was asked for. |
| `POST /api/domains` | session | Claims a domain: issues the token and returns the record to create. |
| `GET /api/domains` | session | The domains on this account, archived ones left out. |
| `GET /api/domains/:id` | session | The open claim, every claim before it, and the named diagnosis. |
| `POST /api/domains/:id/verify` | session | Reads DNS now instead of waiting for the next scheduled check: the claim comes back proved, or carrying the named reason the record is not there. 409 once the claim has ended. |
| `POST /api/domains/:id/cancel` | session | Ends the open claim. The token stops being accepted. |
| `POST /api/domains/:id/archive` | session | Leaves the list and ends any open claim. Retracts no proof. |
| `ALL /api/auth/*` | none | better-auth, mounted whole: magic link and Google. Not in OpenAPI — the front end reaches it through its own client, not Eden. |
| `ALL /api/inngest` | signature | Where the durable scheduler reaches the API. Absent when `INNGEST_DRIVER=manual`, and never in OpenAPI. |
| `GET /api/health` | none | Pings the database. Hidden from OpenAPI. |

A route asks for a session with `session: true`, which resolves `user` or answers 401 in the
shared error shape. It is opt-in precisely so the public zone read stays public.
