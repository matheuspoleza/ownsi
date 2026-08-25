import type { ClaimView } from "../claims.contract.ts"
import type { ClaimedDomain, ClaimRepository, FindDomains } from "../domain/ports.ts"

export type ListClaimsInput = {
  readonly userId: string
  readonly domainId?: string
}

export type ListClaims = (input: ListClaimsInput) => Promise<readonly ClaimView[]>

export type ListClaimsDeps = {
  readonly claims: ClaimRepository
  readonly findDomains: FindDomains
}

export function listClaims(deps: ListClaimsDeps): ListClaims {
  return async ({ userId, domainId }) => {
    const [claims, domains] = await Promise.all([
      deps.claims.listByUser(userId),
      deps.findDomains(userId),
    ])

    const named = new Map<string, ClaimedDomain>(domains.map((domain) => [domain.id, domain]))

    return claims.flatMap((claim) => {
      if (domainId !== undefined && claim.domainId !== domainId) return []

      const domain = named.get(claim.domainId)
      return domain === undefined ? [] : [{ claim, domain }]
    })
  }
}
