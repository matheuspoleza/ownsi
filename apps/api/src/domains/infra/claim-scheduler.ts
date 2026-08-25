import type { InngestClient } from "../../shared/inngest.ts"
import type { CheckWhenDue, ScheduleClaim } from "../domain/ports.ts"

export const CLAIM_OPENED = "domains/claim.opened"

type ClaimOpened = {
  readonly userId: string
  readonly domainId: string
  readonly claimId: string
  readonly checkAt: string
}

export function inngestScheduleClaim(client: InngestClient): ScheduleClaim {
  return async ({ userId, domainId, claimId, checkAt }) => {
    await client.send({
      name: CLAIM_OPENED,
      data: { userId, domainId, claimId, checkAt: checkAt.toISOString() },
    })
  }
}

export const manualScheduling: ScheduleClaim = async () => {}

export function claimWatcher(client: InngestClient, checkWhenDue: CheckWhenDue) {
  return client.createFunction(
    { id: "watch-claim", concurrency: { key: "event.data.domainId", limit: 1 } },
    { event: CLAIM_OPENED },
    async ({ event, step }) => {
      const claim = event.data as ClaimOpened
      let checkAt: string | null = claim.checkAt

      for (let round = 0; checkAt !== null; round += 1) {
        await step.sleepUntil(`until-check-${round}`, new Date(checkAt))

        checkAt = await step.run(`check-${round}`, async () => {
          const next = await checkWhenDue({ userId: claim.userId, domainId: claim.domainId })
          return next === null ? null : next.toISOString()
        })
      }

      return { claimId: claim.claimId, watched: "until the claim became history" }
    },
  )
}
