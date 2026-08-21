# ownsi

Prova de posse de domínio. Especificação em [`docs/domain-ownership/prd.md`](docs/domain-ownership/prd.md);
o *porquê* de cada decisão em [`docs/domain-ownership/decisions.md`](docs/domain-ownership/decisions.md).

## Estrutura

```
apps/
  api/          Bun + Elysia · functional core, imperative shell (PRD §3.3)
    src/core/     puro, sem I/O — Domain, sondas, diagnóstico, máquina de estado
    src/app/      casos de uso; recebem as portas por parâmetro
    src/infra/    DoH, autoritativo, Prisma, Resend, Inngest, better-auth
    src/http/     rotas Elysia — validam, chamam o caso de uso, mapeiam resposta
    src/inngest/  funções duráveis; chamam o MESMO caso de uso
  web/          Vite + React 19 + TanStack + Tailwind 4
    worker/       Worker da Cloudflare: assets estáticos + proxy de /api e /p
packages/
  db/           Prisma 7 + Neon (adapter-pg)
  emails/       React Email
  ui/           design system (shadcn/ui, tokens da marca)
  tsconfig/      configs de TypeScript compartilhadas
```

## Comandos

| Comando | O que faz |
|---|---|
| `bun install` | instala o workspace inteiro |
| `bun run dev` | api (`:3000`) e web (`:5173`) em paralelo; o Vite proxia `/api` e `/p` |
| `bun run build` | build de todos os pacotes |
| `bun run test` | `bun test` no núcleo |
| `bun run lint` / `bun run check` | Biome |
| `bun run typecheck` | `tsc --noEmit` por workspace |
| `bun run db:migrate` | `prisma migrate dev` |

Turborepo orquestra e cacheia as tasks (`turbo.json`); Bun workspaces resolvem os pacotes.

## Setup

```sh
cp .env.example .env    # Neon, Resend, better-auth, Inngest
bun install
bun run db:migrate
bun run dev
```
