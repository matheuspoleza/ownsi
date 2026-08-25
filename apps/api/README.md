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

  zones/             reading a zone: nameservers, provider, publishing estimate
    zones.config.ts    the config this context reads
    zones.module.ts    the object graph — use cases, no transport
    zones.app.ts       the Elysia plugin
    domain/            types, pure functions, port definitions
    application/       use cases and queries
    api/               route factories and wire schemas
    infra/             adapters: DoH, UDP/53, Postgres, recorded fakes

  domains/           a domain on an account: the token, the state, the lifecycle
    domains.config.ts  the config this context reads
    domains.module.ts  the object graph — use cases, no transport
    domains.app.ts     the Elysia plugin
    domain/            Domain, Claim, and the one-way lifecycle between them
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
    diagnosis.ts       the 13 codes, and the cause and fix each one reads as
    claim-lifecycle.ts the four states, the status derived from them, the check outcome
    demo.ts            one domain per screen: the fake's seed, the docs, the video

scripts/
  emit-docs.ts       writes apps/docs' openapi.json and diagnostics catalogue

test/
  architecture.test.ts   layer boundaries; fails the build when one is crossed
  conventions.test.ts    comments, classes, throwing, response schemas
  docs.test.ts           the emitted documentation still matches the code
  zones/, domains/       each context's own tests
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

`domains` answers the whole contract but keeps its records in memory and seeds them from
`shared/demo.ts`: one demo domain per screen, so the front end can be built and polished
against real Eden types before a row is ever written. `DomainsDriver` has one member on
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
| `POST /api/domains/:id/verify` | session | Asks for a check on the open claim; the check itself is the verification context's, still to build. 409 once the claim has ended. |
| `POST /api/domains/:id/cancel` | session | Ends the open claim. The token stops being accepted. |
| `POST /api/domains/:id/archive` | session | Leaves the list and ends any open claim. Retracts no proof. |
| `ALL /api/auth/*` | none | better-auth, mounted whole: magic link and Google. Not in OpenAPI — the front end reaches it through its own client, not Eden. |
| `GET /api/health` | none | Pings the database. Hidden from OpenAPI. |

A route asks for a session with `session: true`, which resolves `user` or answers 401 in the
shared error shape. It is opt-in precisely so the public zone read stays public.
