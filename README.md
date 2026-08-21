# ownsi

Domain ownership proof. The spec lives in [`docs/domain-ownership/prd.md`](docs/domain-ownership/prd.md);
the *why* behind every decision is in [`docs/domain-ownership/decisions.md`](docs/domain-ownership/decisions.md).

## Layout

```
apps/
  api/          Bun + Elysia · functional core, imperative shell (PRD §3.3)
    src/core/     pure, no I/O — Domain, probes, diagnosis, state machine
    src/app/      use cases; ports arrive as parameters
    src/infra/    DoH, authoritative DNS, Prisma, Resend, Inngest, better-auth
    src/http/     Elysia routes — validate, call the use case, map the response
    src/inngest/  durable functions; they call the SAME use case
  web/          Vite + React 19 + TanStack + Tailwind 4
    worker/       Cloudflare Worker: static assets + /api and /p proxy
packages/
  db/           Prisma 7 + Neon (adapter-pg)
  emails/       React Email
  ui/           design system (shadcn/ui, brand tokens)
  tsconfig/     shared TypeScript configs
```

## Running locally

Needs [Bun](https://bun.sh) and a running Docker Desktop.

```sh
cp .env.example .env
bun install
bun run setup     # brings up Postgres + Inngest, migrates and seeds the database
bun run dev       # API on :3000, front end on :5173
```

Open `http://localhost:5173`. Vite proxies `/api` and `/p` to the API, so dev runs on
a single origin — the same shape the Worker gives us in production (PRD §3.1).

| Service | Where | What it is |
|---|---|---|
| Front end | http://localhost:5173 | Vite dev server |
| API | http://localhost:3000/api/health | Elysia |
| API docs | http://localhost:3000/openapi | generated from each route's `response` |
| Inngest | http://localhost:8288 | Dev Server; discovers the app at `/api/inngest` |
| Postgres | localhost:5432 | `ownsi` / `ownsi` / `ownsi` |

## Commands

| Command | What it does |
|---|---|
| `bun run setup` | infra + migrate + seed, from scratch |
| `bun run dev` | api and web in parallel |
| `bun run infra:up` / `infra:down` / `infra:logs` | docker compose |
| `bun run db:migrate` / `db:seed` / `db:reset` / `db:studio` | Prisma |
| `bun run build` | build every package |
| `bun run test` | `bun test` over the core |
| `bun run lint` / `bun run check` | Biome |
| `bun run typecheck` | `tsc --noEmit` per workspace |

Turborepo orchestrates and caches the tasks (`turbo.json`); Bun workspaces resolve the
packages. The `.env` sits at the root and reaches each app through `--env-file`.

## What already stands

The vertical slice, and nothing more: the front end lists claims coming from Postgres
through Eden Treaty (server types, no codegen), `/api/health` pings the database, and the
*Check* button dispatches an event that Inngest runs in a durable function reading that
same database. No domain logic yet — the pure core is D2 on the plan.
