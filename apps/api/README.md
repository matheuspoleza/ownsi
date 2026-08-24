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

  shared/            what more than one context needs
    http/              error shape and the health route
    clock.ts           injected so tests state the time instead of waiting for it
    result.ts          Result, and the exhaustiveness guard for tagged unions

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

Contexts still to build: `auth`, `claims`, `proof`, `verification`. What they owe is in
[the PRD](../../docs/domain-ownership/prd.md); commit `` has the pre-refactor sketch.

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
| `GET /api/health` | none | Pings the database. Hidden from OpenAPI. |
