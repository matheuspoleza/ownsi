import { Elysia, t } from "elysia"
import { prisma } from "../infra/prisma.ts"
import { inngest } from "../inngest/client.ts"

const Claim = t.Object({
  id: t.String(),
  domainAscii: t.String(),
  state: t.UnionEnum(["PENDING", "PROVED", "EXPIRED", "DORMANT", "ARCHIVED"]),
  createdAt: t.String(),
})

// `response` is never optional: it pins the type on the front end, keeps an internal
// Prisma field from serializing, and fills in /openapi. (PRD §3.2)
export const claims = new Elysia({ prefix: "/claims" })
  .get(
    "/",
    async () => {
      const rows = await prisma.claim.findMany({ orderBy: { createdAt: "asc" } })
      return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
    },
    { response: t.Array(Claim) },
  )
  .post(
    "/:id/check",
    async ({ params }) => {
      const { ids } = await inngest.send({
        name: "claim/check.requested",
        data: { claimId: params.id },
      })
      return { queued: true as const, eventId: ids[0] ?? "" }
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Object({ queued: t.Literal(true), eventId: t.String() }),
    },
  )
