import type { Publish } from "../../shared/bus.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { ClaimEvent } from "../claims.contract.ts"
import { expire, isOpen } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"

export type ExpireClaimInput = {
  readonly claimId: string
  readonly at: Date
}

export type ExpireClaimError = { readonly type: "not_found" } | { readonly type: "claim_ended" }

export type ExpireClaim = (input: ExpireClaimInput) => Promise<Result<void, ExpireClaimError>>

export type ExpireClaimDeps = {
  readonly claims: ClaimRepository
  readonly publish: Publish<ClaimEvent>
}

export function expireClaim(deps: ExpireClaimDeps): ExpireClaim {
  return async ({ claimId, at }) => {
    const found = await deps.claims.findById(claimId)
    if (found === null) return err({ type: "not_found" })
    if (!isOpen(found)) return err({ type: "claim_ended" })

    const expired = expire(found, at)
    await deps.claims.save(expired)

    await deps.publish({
      name: "claims/claim.ended",
      data: {
        claimId: expired.id,
        userId: expired.userId,
        domainId: expired.domainId,
        reason: "expired",
        endedAt: expired.endedAt,
      },
    })

    return ok(undefined)
  }
}
