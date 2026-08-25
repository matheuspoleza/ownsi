import type { Claim } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"

export function inMemoryClaimRepository(seed: readonly Claim[] = []): ClaimRepository {
  const claims = new Map<string, Claim>(seed.map((claim) => [claim.id, claim]))

  const ownedBy = (userId: string) =>
    [...claims.values()].filter((claim) => claim.userId === userId)

  return {
    findById: async (userId, id) => {
      const claim = claims.get(id)
      return claim && claim.userId === userId ? claim : null
    },
    findByDomain: async (userId, domain) =>
      ownedBy(userId).find((claim) => claim.domain === domain) ?? null,
    listByUser: async (userId) =>
      ownedBy(userId).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    save: async (claim) => {
      claims.set(claim.id, claim)
    },
  }
}
