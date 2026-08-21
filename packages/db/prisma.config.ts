import { defineConfig } from "prisma/config"

// Prisma 7 tirou as URLs do schema.prisma — elas vivem aqui.
// A CLI (migrate/introspect) usa a URL não-poolada do Neon; a aplicação conecta
// pelo adapter-pg em src/index.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
})
