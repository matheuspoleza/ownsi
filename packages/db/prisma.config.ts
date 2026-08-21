import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "prisma/config"

// The .env lives at the monorepo root; the Prisma CLI runs from this package.
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

// Prisma 7 moved connection URLs out of schema.prisma. The CLI (migrate/introspect)
// uses the direct URL; the application connects through adapter-pg in src/index.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
})
