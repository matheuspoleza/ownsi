import { Elysia, t } from "elysia"
import type { Database } from "../database.ts"

export function healthRoutes(database: Database) {
  return new Elysia({ name: "shared.health" }).get(
    "/health",
    async () => {
      await database.$queryRaw`SELECT 1`
      return { status: "ok" as const, db: "up" as const }
    },
    {
      response: t.Object({ status: t.Literal("ok"), db: t.Literal("up") }),
      detail: { hide: true },
    },
  )
}
