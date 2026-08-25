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
    infra/             better-auth.service.ts and magic-link.service.ts

  zones/             reading a zone: nameservers, provider, publishing estimate
    zones.config.ts    the config this context reads
    zones.module.ts    the object graph — use cases, no transport
    zones.app.ts       the Elysia plugin
    zones.contract.ts  the language another context may speak about a zone
    domain/            types, pure functions, port definitions
    application/       use cases and queries
    api/               route factories and wire schemas
    infra/             adapters: DoH, UDP/53, Postgres, and the recorded answers
                       the fakes replay

  domains/           a name on an account, and nothing else: no status, no token
    domains.module.ts  the object graph — use cases, no transport
    domains.app.ts     the Elysia plugin
    domains.contract.ts  DomainRef, and the one event: DomainArchived
    domain/            Domain, and the two things that happen to one
    application/       find-or-create, archive, delete, get, list
    api/               route factories and wire schemas
    infra/             domain.repository.ts, and that is all it needs

  claims/            the episode: one token, one seven-day window, one outcome
    claims.config.ts   the config this context reads
    claims.module.ts   the object graph — use cases, no transport
    claims.app.ts      the Elysia plugin
    claims.contract.ts what proof will speak: ClaimView, ClaimDetail, ClaimEnded
    domain/            claim.ts is the four states and the three ways out;
                       challenge.ts the record to write; notice.ts when to say
                       something; coexistence.ts the masked other claimant
    application/       create, cancel, prove, expire, notify — and two queries.
                       prove, expire and notify are reached by reacting to an event
                       and are ordinary use cases a test calls with no bus in sight
    infra/             adapters: the Postgres store, the coexistence query, the
                       token, the notice emails and the ceiling that keeps them to
                       one per claim per notice per day

  verification/      the process: did this token appear at this host, and if not, why
    verification.config.ts    the config this context reads
    verification.module.ts    the object graph — use cases, no transport
    verification.app.ts       the Elysia plugin
    verification.contract.ts  what claims may speak: the diagnosis vocabulary, the
                       three events, and none of the observation, the quorum or
                       the probes
    domain/            verification.ts is the aggregate and every transition;
                       backoff.ts the cadence; attempt.ts the three outcomes;
                       diagnosis.ts the 13 codes and the cause and fix each one
                       reads as; methods/txt/ the reduced observation, the quorum
                       of three, and the probes
    application/       create, run, stop, and two queries — plus
                       verify-until-deadline.schedule.ts, the loop, over a Step port
    infra/             adapters: DoH over three resolvers, UDP/53 to the zone's own
                       nameservers, the Postgres store, the Inngest send and the
                       Inngest step, the anti-corruption layer over zones, the fake

  shared/            what more than one context needs
    http/              error shape, the health route, and the session macro every
                       context opts into — the handoff, not the authenticating
    bus.ts             a typed envelope, and one in-process adapter. Event shapes
                       never live here; they belong to the context that publishes them
    clock.ts           injected so tests state the time instead of waiting for it
    time.ts            daysAfter, secondsAfter, secondsBetween — one meaning for all
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
  docs.test.ts           the emitted documentation still matches the code
  harness.ts             createApp with in-memory adapters and a faked session
  flow.test.ts           a name to a proof, over HTTP, through the whole graph
  auth/, zones/,         each context's own tests
  domains/, claims/,
  verification/
```

## Where does it go

| Writing | Goes in |
| --- | --- |
| A type, or a function over that type with no I/O | `<context>/domain/` |
| An interface to the outside world | `<context>/domain/ports.ts` |
| A use case | `<context>/application/<verb>-<thing>.use-case.ts` |
| A query | `<context>/application/<verb>-<thing>.query.ts` |
| Something that runs on its own clock | `<context>/application/<name>.schedule.ts` |
| Something that talks to a vendor, a driver, the network | `<context>/infra/` |
| An HTTP route | `<context>/api/<thing>.routes.ts` |
| Wiring a context together | `<context>/<context>.module.ts` |
| Mounting a context's routes | `<context>/<context>.app.ts` |
| Something two contexts need, with one meaning for both | `shared/` |
| What another context may know about this one | `<context>/<context>.contract.ts` |
| Authenticating someone | `auth/` |
| Asking who is on a request | `shared/http/session.ts`, the macro every route opts into |

## A claim is an episode; a verification is a process

Four tables carry it. A `Domain` row per name per account — the name, and nothing else. A `Claim`
row per attempt at proving it, ordered by `sequence`, the highest being the one in play. A
`Verification` row per claim, 1:1, holding the challenge, the deadline and where the process has
got to. And a `VerificationAttempt` row per DNS read, append-only, which is what makes PRD
invariant 6 — *no proof without evidence* — something the schema can hold rather than something a
reviewer has to check. Nothing is kept in memory; a claim survives a restart, which is the whole
point of a seven-day window.

The two contexts talk in two different directions on purpose, and the reasoning is in
[`docs/backend-architecture.md`](../../docs/backend-architecture.md#calls-down-events-up).
`claims` calls `verification` through a port and gets the `verificationId` back at once, so
`POST /api/claims` can answer with it. `verification` publishes three events `claims` reacts to,
and the whole reaction surface of the system is four lines in `src/app.ts`.

Inngest is the clock, not an orchestrator. Creating a verification sends one event; one durable
function per verification then alternates `step.sleepUntil(nextRunAt)` with `runVerification`,
which is the same run the *check now* button runs. It ends when there is no next run — proved,
exhausted or stopped — and cancelling a claim also sends `verification/stopped`, which the
function is registered to cancel on. A run that wakes past the deadline exhausts the verification
instead of reading DNS, which is why expiry needs no sweeper of its own.

The interval is derived, not guessed: 30 s while the verification is minutes old, widening to 6 h
after a day, and never sooner than the SOA MINIMUM says resolvers will forget the "does not
exist". Roughly sixty runs over the seven-day window. `unresolvable` moves nothing except
`consecutiveFailures`, which doubles the wait up to a ceiling — a resolver outage costs the claim
nothing, says nothing, and publishes no event at all.

A run that changes something says so, once. `notifyClaimant` derives the notices from the claim's
own age and the moment of the previous run, so "a resolver outage sends zero emails" is an
assertion over an array with no SMTP in sight. There are four, and each is a state change rather
than a repetition:

| Notice | When |
| --- | --- |
| `proved` | the record was there |
| `nudge` | the claim crossed day one, and again day three, still unresolved |
| `expiring` | the claim crossed day six — one warning, naming the fix that is outstanding |
| `coexistence` | somebody else proved a name you are still claiming |

Nudges and the warning come from crossing a boundary between two runs, not from a counter: the
`AttemptFailed` event carries `since`, the moment of the previous run, so if that was before day
one and this one is after, it crossed, and it crosses once. On top of that `atMostDaily` holds the
PRD's ceiling — at most one email per claim per notice per 24 hours — against `ClaimNotice` rows.
Expiry itself sends nothing: day six already said it, and a second email would only scold.

Contexts still to build: `proof`. What it owes is in
[the PRD](../../docs/domain-ownership/prd.md).

One read crosses a boundary on purpose. `claims/infra/coexistence.repository.ts` joins `Domain`
and `User`, because "is anyone else claiming this name" is a question about names and about
people, and neither belongs to `claims`. It is a read, it is the only one, and it is named so the
next person finds it rather than repeats it.

Auth is not among them: it is built. Authenticating is a domain with an owner; asking who is on
a request is transport. The reasoning for that split is in
[`CLAUDE.md`](../../CLAUDE.md#auth-is-a-context-the-http-session-is-not).

A context reaches another only through `<other>/<other>.contract.ts`, and only along an arrow
declared in `CONTEXT_MAP` in `test/architecture.test.ts` — today `verification → zones` and
`claims → domains, verification`. The
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

The front end does not read that document. `packages/sdk` imports the `App` type from
`src/index.ts` and hands it to Eden Treaty, which turns the route tree into a typed client with
no codegen and no generated files to keep in sync — a renamed route or a changed response is a
type error in the SDK, and through it in `apps/web`, not a runtime surprise.
`verbatimModuleSyntax` erases the import, so none of this reaches the browser bundle.

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
| `POST /api/domains` | session | Puts a name on the account. Idempotent: asking twice returns the same domain. |
| `GET /api/domains` | session | The domains on this account, archived ones left out. |
| `GET /api/domains/:id` | session | One domain. Archived ones still read. |
| `POST /api/domains/:id/archive` | session | Leaves the list and ends any claim open on the name. Retracts no proof. |
| `DELETE /api/domains/:id` | session | The only eraser. Claims, verifications and proof links go with it. |
| `POST /api/claims` | session | Opens a claim on a domain: issues the token, returns the record to create and the `verificationId` behind it. 409 while one is already open. |
| `GET /api/claims` | session | Every claim on this account, newest first. `?domainId=` narrows it. |
| `GET /api/claims/:id` | session | One claim, with whether another account has proved the same name. |
| `POST /api/claims/:id/cancel` | session | Ends the claim and stops its verification. The token stops being accepted. |
| `GET /api/verifications/:id` | session | Where the process is: the named diagnosis, the wait, the next run, the deadline. |
| `GET /api/verifications/:id/attempts` | session | Every read this verification has made, newest first. The evidence a proof rests on. |
| `POST /api/verifications/:id/runs` | session | Reads DNS now instead of waiting for the schedule. 409 once the process has finished. |
| `ALL /api/auth/*` | none | better-auth, mounted whole: magic link and Google. Not in OpenAPI — the front end reaches it through its own client, not Eden. |
| `ALL /api/inngest` | signature | Where the durable scheduler reaches the API. Absent when `INNGEST_DRIVER=manual`, and never in OpenAPI. |
| `GET /api/health` | none | Pings the database. Hidden from OpenAPI. |

A route asks for a session with `session: true`, which resolves `user` or answers 401 in the
shared error shape. It is opt-in precisely so the public zone read stays public.

The three resources stay separate on the wire because the backend stays split along its seams.
[`packages/sdk`](../../packages/sdk/README.md) recomposes them into `domain.claim()` client-side,
where it costs the backend nothing.
