import type { Publish } from "../../shared/bus.ts"
import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { ClaimEvent, ClaimView } from "../claims.contract.ts"
import { cancel, isOpen } from "../domain/claim.ts"
import type { ClaimRepository, FindDomain, StopVerifying } from "../domain/ports.ts"

export type CancelClaimInput = {
  readonly userId: string
  readonly claimId: string
}

export type CancelClaimError = { readonly type: "not_found" } | { readonly type: "claim_ended" }

export type CancelClaim = (input: CancelClaimInput) => Promise<Result<ClaimView, CancelClaimError>>

export type CancelClaimDeps = {
  readonly claims: ClaimRepository
  readonly findDomain: FindDomain
  readonly stopVerifying: StopVerifying
  readonly publish: Publish<ClaimEvent>
  readonly clock: Clock
}

export function cancelClaim(deps: CancelClaimDeps): CancelClaim {
  return async ({ userId, claimId }) => {
    const found = await deps.claims.findById(claimId)
    if (found === null || found.userId !== userId) return err({ type: "not_found" })
    if (!isOpen(found)) return err({ type: "claim_ended" })

    const domain = await deps.findDomain({ userId, domainId: found.domainId })
    if (domain === null) return err({ type: "not_found" })

    const canceled = cancel(found, deps.clock())
    await deps.claims.save(canceled)

    if (canceled.verificationId !== null) {
      await deps.stopVerifying({ verificationId: canceled.verificationId })
    }

    await deps.publish({
      name: "claims/claim.ended",
      data: {
        claimId: canceled.id,
        userId: canceled.userId,
        domainId: canceled.domainId,
        reason: "canceled",
        endedAt: canceled.endedAt,
      },
    })

    return ok({ claim: canceled, domain })
  }
}
