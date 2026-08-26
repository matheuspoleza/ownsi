import type { DomainCounts, DomainListing, DomainStatus, ListedDomain } from "../domain/ports.ts"

export type ListDomainsInput = {
  readonly userId: string
  readonly name: string | null
  readonly status: DomainStatus | null
  readonly after: string | null
  readonly limit: number
}

export type DomainsPage = {
  readonly domains: readonly ListedDomain[]
  readonly counts: DomainCounts
  readonly nextCursor: string | null
}

export type ListDomains = (input: ListDomainsInput) => Promise<DomainsPage>

export function listDomains(listing: DomainListing): ListDomains {
  return async ({ userId, name, status, after, limit }) => {
    const [found, counts] = await Promise.all([
      listing.listPage({ userId, name, status, after, limit: limit + 1 }),
      listing.countByStatus(userId),
    ])

    const domains = found.slice(0, limit)

    return {
      domains,
      counts,
      nextCursor: found.length > limit ? (domains.at(-1)?.domain.id ?? null) : null,
    }
  }
}
