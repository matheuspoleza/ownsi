import type { AccountDomain } from "../../src/domains/domain/account-domain.ts"
import type { AccountDomainRepository } from "../../src/domains/domain/ports.ts"

export function inMemoryDomainRepository(
  seed: readonly AccountDomain[] = [],
): AccountDomainRepository {
  const records = new Map<string, AccountDomain>()

  const key = (userId: string, domainId: string) => `${userId}:${domainId}`

  const ownedBy = (userId: string) =>
    [...records.values()].filter((record) => record.userId === userId)

  for (const record of seed) records.set(key(record.userId, record.domain.id), record)

  return {
    findById: async (userId, domainId) => records.get(key(userId, domainId)) ?? null,
    findByName: async (userId, nameAscii) =>
      ownedBy(userId).find((record) => record.domain.nameAscii === nameAscii) ?? null,
    listByUser: async (userId) =>
      ownedBy(userId).sort(
        (left, right) => right.claim.createdAt.getTime() - left.claim.createdAt.getTime(),
      ),
    save: async (record) => {
      records.set(key(record.userId, record.domain.id), record)
    },
  }
}
