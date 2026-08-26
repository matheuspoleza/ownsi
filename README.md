# ownsi

[![Proved with ownsi](https://ownsi.dev/p/znd7mmzmjh/badge.svg)](https://ownsi.dev/p/znd7mmzmjh)

Domain ownership proof. The spec lives in [`docs/domain-ownership/prd.md`](docs/domain-ownership/prd.md).

## Layout

```
apps/
  api/          Bun + Elysia · one folder per bounded context — see apps/api/README.md
  web/          Vite + React 19 + TanStack + Tailwind 4
    worker/       Cloudflare Worker: static assets + /api and /p proxy
  docs/         Mintlify · the public site — see apps/docs/README.md
packages/
  db/           Prisma 7 + Neon (adapter-pg)
  emails/       React Email
  ui/           design system (shadcn/ui, brand tokens)
  tsconfig/     shared TypeScript configs
```

Backend rules live in [`CLAUDE.md`](CLAUDE.md), their reasoning in
[`docs/backend-architecture.md`](docs/backend-architecture.md), and the map of the API in
[`apps/api/README.md`](apps/api/README.md).

Two kinds of documentation, and they do not overlap. `docs/` is internal — the PRD, the
architecture reasoning, the design research. [`apps/docs/`](apps/docs/README.md) is the public
site: quickstart, concepts, the API reference and the diagnostics catalogue, with the reference
and the catalogue generated from `apps/api` so they cannot drift.

## Running locally

Needs [Bun](https://bun.sh) and a running Docker Desktop.

```sh
cp .env.example .env
bun install
bun run setup     # brings up Postgres and the Inngest Dev Server, and migrates
bun run dev       # API on :3000, front end on :5173
```

Open `http://localhost:5173`. Vite proxies `/api` and `/p` to the API, so dev runs on
a single origin — the same shape the Worker gives us in production (PRD §3.7).

| Service | Where | What it is |
|---|---|---|
| Front end | http://localhost:5173 | Vite dev server |
| API | http://localhost:3000/api/health | Elysia |
| API docs | http://localhost:3000/openapi | generated from each route's `response` |
| Public docs | http://localhost:3000 | Mintlify, via `bun run dev:docs` — not at the same time as the API |
| Postgres | localhost:5432 | `ownsi` / `ownsi` / `ownsi` |

## Commands

| Command | What it does |
|---|---|
| `bun run setup` | infra + migrate, from scratch |
| `bun run dev` | api and web in parallel |
| `bun run dev:docs` | the Mintlify site, after regenerating what is generated |
| `bun run docs:emit` | rewrite `openapi.json` and the diagnostics catalogue from the code |
| `bun run infra:up` / `infra:down` / `infra:logs` | docker compose |
| `bun run db:migrate` / `db:reset` / `db:studio` | Prisma |
| `bun run build` | build every package |
| `bun run test` | `bun test` over the core |
| `bun run lint` / `bun run check` | Biome |
| `bun run typecheck` | `tsc --noEmit` per workspace |

Turborepo orchestrates and caches the tasks (`turbo.json`); Bun workspaces resolve the
packages. The `.env` sits at the root and reaches each app through `--env-file`.

## What already stands

**The claim flow, from the logged-out landing page to the magic link.** Five screens off
`designs.pen` — landing, the work-email suggestion, reading the zone, sign in, check your
email — on a design system in `packages/ui`: brand tokens lifted from the canvas, shadcn/ui
primitives, and the meerkat and dot-grid world map as real assets.

Reading the zone and sending the magic link are both wired to the real thing:
`apps/web/src/api/auth.api.ts` calls better-auth's client, and the `auth` context behind
it renders the email and hands it to Resend.

**A claim that runs on its own.** Opening one writes a Postgres row and wakes an Inngest
durable function that watches it until it becomes history — checking the zone on an
interval that widens with the claim's age, backing off when a resolver is down, and
stopping the moment the claim is proved, canceled or seven days old. What it finds comes
back as one of thirteen named diagnoses, and the emails a claim owes — proved, the D+1
and D+3 nudges, the D+6 warning, and the notice to anyone else claiming the same
name — fall out of that as data, under a 24-hour ceiling per kind.

`normalizeDomain` in `apps/web/src/lib/domain.utils.ts` is the field's own copy of the entry
normalisation, so the input can answer before a round trip; the authoritative version —
with the public-suffix warning — lives in `apps/api/src/shared/domain-name.ts`.

### `GET /api/zones/:name`

The first real endpoint, and the only one with no account behind it.

```sh
curl -s localhost:3000/api/zones/app.staging.github.com
```

```json
{
  "name": "github.com",
  "domain": { "ascii": "app.staging.github.com", "normalisations": [], "isPublicSuffix": false },
  "nameservers": ["dns1.p08.nsone.net", "..."],
  "provider": "other",
  "publishingMinutes": 60,
  "negativeCacheTtlSeconds": 3600,
  "cached": false
}
```

Three things it gets deliberately right:

**A failure to reach DNS is never a statement about the domain.** `SERVFAIL` and a timeout
answer `502 unresolvable`, not `404`. The type system enforces it rather than a reviewer:
a lookup is `{ type: "answered", records }` or `{ type: "failed", reason }`, so no caller
can read records off a lookup that failed.

**A split delegation gets the generic instruction.** `github.com` runs four NS1 and four
Route 53 nameservers; naming either panel sends half those people to the wrong screen, so
provider detection needs a strict majority of the whole set or answers `other`.

**A slow zone costs the estimate, not the reading.** The publishing estimate comes from the
zone's own nameservers over UDP/53, raced in parallel under `SOA_BUDGET_MS`. Past the
budget `publishingMinutes` is simply absent and everything else still lands.

The Postgres cache is keyed on the name that was asked for, not the zone that answered, so
a repeat of the same request costs no DNS query at all. That is what stops the endpoint
being an open resolver; the Cloudflare rate limiting rules in `apps/web/worker` are the
boundary in front of it.

### How the front end talks to it

`apps/web/src/api` is the only place that knows a server exists. `eden.client.ts` builds an
Eden Treaty client from the API's exported `App` type:

```ts
export const api = treaty<App>(window.location.origin).api
```

That is the whole SDK. No codegen, no generated client to regenerate — the route tree *is*
the type, so `api.zones({ name }).get()` returns `{ data, error }` where `data` is the 200
body and `error` is the union of the documented 400, 404 and 502 shapes. Renaming a route or
changing a response breaks `bun run typecheck` in `apps/web`. The import is type-only, so
nothing of the server reaches the bundle.

`zone.api.ts` turns that into one promise and keeps the API's own error copy, so the browser
repeats the distinction the endpoint makes rather than flattening it into "something went
wrong". `/openapi/json` still serves the document, for anything outside this repo.

Also standing: `/api/health` pings the database.
