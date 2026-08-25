import type { Domain } from "../../src/domains/domain/domain.ts"
import type { DomainRepository } from "../../src/domains/domain/ports.ts"

export function inMemoryDomainRepository(seed: readonly Domain[] = []): DomainRepository {
  const stored = new Map<string, Domain>(seed.map((domain) => [domain.id, domain]))

  const ownedBy = (userId: string) =>
    [...stored.values()].filter((domain) => domain.userId === userId)

  return {
    findById: async (domainId) => stored.get(domainId) ?? null,
    findByName: async (userId, nameAscii) =>
      ownedBy(userId).find((domain) => domain.nameAscii === nameAscii) ?? null,
    listByUser: async (userId) =>
      ownedBy(userId).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
    save: async (domain) => {
      stored.set(domain.id, domain)
    },
    remove: async (domainId) => {
      stored.delete(domainId)
    },
  }
}
