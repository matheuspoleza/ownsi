import { err, ok, type Result } from "../../shared/result.ts"
import type { Claim } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"

export type ClaimNotFound = { readonly type: "not_found" }

export type ReadClaimInput = {
  readonly userId: string
  readonly id: string
}

export type ReadClaim = (input: ReadClaimInput) => Promise<Result<Claim, ClaimNotFound>>

export type ReadClaimDeps = {
  readonly claims: ClaimRepository
}

export function createReadClaim(deps: ReadClaimDeps): ReadClaim {
  return async ({ userId, id }) => {
    const claim = await deps.claims.findById(userId, id)
    return claim ? ok(claim) : err({ type: "not_found" })
  }
}
