import type { Claim, OpenClaim } from "../../src/claims/domain/claim.ts"
import type { ClaimRepository } from "../../src/claims/domain/ports.ts"

export type InMemoryClaims = ClaimRepository & {
  readonly all: () => readonly Claim[]
}

export function inMemoryClaimRepository(seed: readonly Claim[] = []): InMemoryClaims {
  const stored = new Map<string, Claim>(seed.map((claim) => [claim.id, claim]))

  const newestFirst = () =>
    [...stored.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())

  return {
    findById: async (claimId) => stored.get(claimId) ?? null,
    findOpenByDomain: async (domainId) =>
      (newestFirst().find((claim) => claim.domainId === domainId && claim.state === "pending") as
        | OpenClaim
        | undefined) ?? null,
    listByUser: async (userId) => newestFirst().filter((claim) => claim.userId === userId),
    listByDomain: async (domainId) => newestFirst().filter((claim) => claim.domainId === domainId),
    save: async (claim) => {
      stored.set(claim.id, claim)
    },
    all: () => newestFirst(),
  }
}
