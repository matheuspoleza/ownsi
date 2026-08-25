import { err, ok, type Result } from "../../shared/result.ts"
import { expire, isOpen } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"

export type ExpireClaimInput = {
  readonly claimId: string
  readonly at: Date
}

export type ExpireClaimError = { readonly type: "not_found" } | { readonly type: "claim_ended" }

export type ExpireClaim = (input: ExpireClaimInput) => Promise<Result<void, ExpireClaimError>>

export function expireClaim(claims: ClaimRepository): ExpireClaim {
  return async ({ claimId, at }) => {
    const found = await claims.findById(claimId)
    if (found === null) return err({ type: "not_found" })
    if (!isOpen(found)) return err({ type: "claim_ended" })

    await claims.save(expire(found, at))

    return ok(undefined)
  }
}
