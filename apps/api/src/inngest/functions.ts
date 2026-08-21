// Registry of the durable functions served at /api/inngest.
import { inngest } from "./client.ts"

/** Minimal slice: proves event → function → step is wired. Becomes watch-claim on D4. */
export const claimCheckRequested = inngest.createFunction(
  { id: "claim-check-requested" },
  { event: "claim/check.requested" },
  async ({ event, step }) => {
    const claim = await step.run("load-claim", async () => {
      const { prisma } = await import("../infra/prisma.ts")
      return prisma.claim.findUnique({ where: { id: event.data.claimId as string } })
    })

    return { claimId: event.data.claimId, domain: claim?.domainAscii ?? null }
  },
)

export const functions = [claimCheckRequested]
