import type { Claim } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"

export type ListClaimsInput = {
  readonly userId: string
}

export type ListClaims = (input: ListClaimsInput) => Promise<readonly Claim[]>

export type ListClaimsDeps = {
  readonly claims: ClaimRepository
}

export function createListClaims(deps: ListClaimsDeps): ListClaims {
  return ({ userId }) => deps.claims.listByUser(userId)
}
