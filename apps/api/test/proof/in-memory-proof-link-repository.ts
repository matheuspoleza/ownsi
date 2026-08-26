import type { ProofLinkRepository } from "../../src/proof/domain/ports.ts"
import type { ProofLink } from "../../src/proof/domain/proof-link.ts"

export type InMemoryProofLinks = ProofLinkRepository & {
  readonly all: () => readonly ProofLink[]
}

export function inMemoryProofLinkRepository(seed: readonly ProofLink[] = []): InMemoryProofLinks {
  const stored = new Map<string, ProofLink>(seed.map((link) => [link.slug, link]))

  const newestFirst = () =>
    [...stored.values()].sort((left, right) => right.issuedAt.getTime() - left.issuedAt.getTime())

  return {
    findBySlug: async (slug) => stored.get(slug) ?? null,
    listByClaim: async (claimId) => newestFirst().filter((link) => link.claimId === claimId),
    save: async (link) => {
      stored.set(link.slug, link)
    },
    all: newestFirst,
  }
}
