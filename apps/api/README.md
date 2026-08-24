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

  dns/               reading a zone: nameservers, provider, publishing estimate
    dns.config.ts      the config this context reads
    dns.module.ts      the object graph — use cases, no transport
    dns.app.ts         the Elysia plugin
    domain/            types, pure functions, port definitions
    application/       use cases and queries
    api/               route factories and wire schemas
    infra/             adapters: DoH, UDP/53, Postgres, recorded fakes

  claims/            a domain on an account: the token, the state, the lifecycle
    claims.config.ts   the config this context reads
    claims.module.ts   the object graph — use cases, no transport
    claims.app.ts      the Elysia plugin
    domain/            Claim, the challenge record, the lifecycle transitions
    application/       use cases and queries
    api/               route factories and wire schemas
    infra/             adapters: the in-memory store, the demo catalogue, identifiers

  shared/            what more than one context needs
    http/              error shape, the health route, the session macro
    auth.ts            the configured better-auth instance; identity is cross-cutting
    mailer.ts          SendMagicLink, over Resend or stdout
    clock.ts           injected so tests state the time instead of waiting for it
    result.ts          Result, and the exhaustiveness guard for tagged unions
    domain-name.ts     parse, normalise, punycode and the public suffix list
    diagnosis.ts       the 12 codes, and the cause and fix each one reads as
    claim-status.ts    the status a claim shows, and the three-valued check outcome
    demo.ts            one domain per screen: the fake's seed, the docs, the video

test/
  architecture.test.ts   layer boundaries; fails the build when one is crossed
  conventions.test.ts    comments, classes, throwing, response schemas
  dns/                   the context's own tests
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
| Something two contexts need | `shared/` |
| Anything to do with identity or sessions | `shared/`, never a context |

`claims` answers the whole contract but keeps its claims in memory and seeds them from
`shared/demo.ts`: one demo domain per screen, so the front end can be built and polished
against real Eden types before a row is ever written. `ClaimsDriver` has one member on
purpose — adding `"postgres"` breaks the build until the adapter exists.

Contexts still to build: `proof`, `verification`. What they owe is in
[the PRD](../../docs/domain-ownership/prd.md); commit `` has the pre-refactor sketch.

Auth is not among them. Identity is cross-cutting, so better-auth is used directly from
`shared/` and there is no `auth/` folder — the reasoning is in
[`CLAUDE.md`](../../CLAUDE.md#auth-is-not-a-bounded-context).

A context never imports another context. `domain/` imports nothing that reaches the world.
`test/architecture.test.ts` enforces both.

## Adding an endpoint

Run the `api-bounded-context` skill, or follow
[`.claude/skills/api-bounded-context/SKILL.md`](../../.claude/skills/api-bounded-context/SKILL.md).

## Commands

```sh
bun run dev         # watch mode, reads ../../.env
bun test            # everything under test/
bun run typecheck
bun run lint
```

The OpenAPI document is at `/openapi` while `dev` is running, as JSON at `/openapi/json`.
It is generated from the same schemas the routes validate against, so there is no second
source of truth for the contract.

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
| `GET /api/domains` | session | The domains on this account. |
| `GET /api/domains/:id` | session | One claim, with its named diagnosis and wait estimate. |
| `POST /api/domains/:id/verify` | session | Asks for a check. Resumes a dormant claim; the check itself is the verification context's, still to build. |
| `POST /api/domains/:id/archive` | session | Leaves the list, keeps the token and the history. |
| `POST /api/domains/:id/restore` | session | Reactivate and recheck, on the same token. |
| `ALL /api/auth/*` | none | better-auth, mounted whole: magic link and Google. Not in OpenAPI — the front end reaches it through its own client, not Eden. |
| `GET /api/health` | none | Pings the database. Hidden from OpenAPI. |

A route asks for a session with `session: true`, which resolves `user` or answers 401 in the
shared error shape. It is opt-in precisely so the public zone read stays public.
