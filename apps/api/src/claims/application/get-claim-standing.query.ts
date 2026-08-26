import type { ClaimState } from "../domain/claim.ts"
import type { ClaimRepository, FindDomain } from "../domain/ports.ts"

/**
 * Where a claim stands, scoped to nobody: a stranger holding a public slug has no session,
 * and what they may read is a fact about the claim rather than about them.
 */
export type ClaimStanding = {
  readonly state: ClaimState
  readonly archived: boolean
}

export type GetClaimStanding = (claimId: string) => Promise<ClaimStanding | null>

export type GetClaimStandingDeps = {
  readonly claims: ClaimRepository
  readonly findDomain: FindDomain
}

export function getClaimStanding(deps: GetClaimStandingDeps): GetClaimStanding {
  return async (claimId) => {
    const claim = await deps.claims.findById(claimId)
    if (claim === null) return null

    const domain = await deps.findDomain({ userId: claim.userId, domainId: claim.domainId })
    if (domain === null) return null

    return { state: claim.state, archived: domain.archived }
  }
}
