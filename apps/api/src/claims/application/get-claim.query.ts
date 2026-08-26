import { err, ok, type Result } from "../../shared/result.ts"
import type { ClaimDetail } from "../claims.contract.ts"
import { coexistenceFor } from "../domain/coexistence.ts"
import type { ClaimRepository, FindCoexistence, FindDomain } from "../domain/ports.ts"

export type ClaimNotFound = { readonly type: "not_found" }

export type GetClaimInput = {
  readonly userId: string
  readonly claimId: string
}

export type GetClaim = (input: GetClaimInput) => Promise<Result<ClaimDetail, ClaimNotFound>>

export type GetClaimDeps = {
  readonly claims: ClaimRepository
  readonly findDomain: FindDomain
  readonly findCoexistence: FindCoexistence
}

export function getClaim(deps: GetClaimDeps): GetClaim {
  return async ({ userId, claimId }) => {
    const found = await deps.claims.findById(claimId)
    if (found === null || found.userId !== userId) return err({ type: "not_found" })

    const domain = await deps.findDomain({ userId, domainId: found.domainId })
    if (domain === null) return err({ type: "not_found" })

    const other = await deps.findCoexistence(domain.nameAscii, userId)

    return ok({ claim: found, domain, coexistence: coexistenceFor(other, found) })
  }
}
