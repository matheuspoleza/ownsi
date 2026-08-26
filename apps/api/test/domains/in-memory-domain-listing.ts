import type { Claim, ClaimState } from "../../src/claims/domain/claim.ts"
import type { ClaimRepository } from "../../src/claims/domain/ports.ts"
import type { Domain } from "../../src/domains/domain/domain.ts"
import type {
  DomainListing,
  DomainRepository,
  ListedDomain,
} from "../../src/domains/domain/ports.ts"

const CLAIMED_STATUSES: readonly ClaimState[] = ["pending", "proved", "expired", "canceled"]

const NONE = {
  unclaimed: 0,
  pending: 0,
  proved: 0,
  expired: 0,
  canceled: 0,
  archived: 0,
}

export function inMemoryDomainListing(
  domains: DomainRepository,
  claims: ClaimRepository,
): DomainListing {
  const listed = async (userId: string): Promise<readonly ListedDomain[]> => {
    const owned = await domains.listByUser(userId)

    return Promise.all(
      owned.map(async (domain) => toListed(domain, await claims.listByDomain(domain.id))),
    )
  }

  return {
    listPage: async ({ userId, name, status, archived, after, limit }) => {
      const ordered = [...(await listed(userId))].sort(byNewest)
      const asked = (entry: ListedDomain) =>
        name === null
          ? (entry.domain.archivedAt !== null) === archived
          : entry.domain.nameAscii === name

      const matching = ordered.filter(
        (entry) => asked(entry) && (status === null || entry.status === status),
      )

      const start =
        after === null ? 0 : matching.findIndex((entry) => entry.domain.id === after) + 1

      return matching.slice(start, start + limit)
    },

    countByStatus: async (userId) => {
      const counted = { ...NONE }
      for (const entry of await listed(userId)) {
        if (entry.domain.archivedAt === null) counted[entry.status] += 1
        else counted.archived += 1
      }

      return counted
    },
  }
}

const byNewest = (left: ListedDomain, right: ListedDomain) => {
  const apart = right.domain.createdAt.getTime() - left.domain.createdAt.getTime()
  return apart !== 0 ? apart : right.domain.id.localeCompare(left.domain.id)
}

function toListed(domain: Domain, claims: readonly Claim[]): ListedDomain {
  const carrying = CLAIMED_STATUSES.map(
    (status) => [status, claims.find((claim) => claim.state === status)] as const,
  ).find(([, claim]) => claim !== undefined)

  const claim = carrying?.[1] ?? null

  return {
    domain,
    status: carrying?.[0] ?? "unclaimed",
    claimId: claim?.id ?? null,
    verificationId: claim?.verificationId ?? null,
    claimStartedAt: claim?.createdAt ?? null,
    claimEndedAt: claim === null || claim.state === "pending" ? null : claim.endedAt,
  }
}
