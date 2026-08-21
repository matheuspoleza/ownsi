import { Elysia, t } from "elysia"
import { prisma } from "../infra/prisma.ts"

export const health = new Elysia().get(
  "/health",
  async () => {
    await prisma.$queryRaw`SELECT 1`
    return { status: "ok" as const, db: "up" as const }
  },
  {
    response: t.Object({
      status: t.Literal("ok"),
      db: t.Literal("up"),
    }),
  },
)
