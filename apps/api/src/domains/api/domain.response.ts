import { type Static, t } from "elysia"
import type { DomainsPage } from "../application/list-domains.query.ts"
import type { Domain } from "../domain/domain.ts"
import { DOMAIN_STATUSES, type ListedDomain } from "../domain/ports.ts"

export const DomainResponse = t.Object({
  id: t.String(),
  name: t.String(),
  unicodeName: t.String(),
  archived: t.Boolean(),
  createdAt: t.String(),
})

export const DomainStatusValue = t.UnionEnum([...DOMAIN_STATUSES], { default: undefined })

export const ListedDomainResponse = t.Composite([
  DomainResponse,
  t.Object({
    status: DomainStatusValue,
    claimId: t.Union([t.String(), t.Null()]),
    verificationId: t.Union([t.String(), t.Null()]),
    claimStartedAt: t.Union([t.String(), t.Null()]),
    claimEndedAt: t.Union([t.String(), t.Null()]),
  }),
])

export const DomainCountsResponse = t.Object({
  unclaimed: t.Number(),
  pending: t.Number(),
  proved: t.Number(),
  expired: t.Number(),
  canceled: t.Number(),
})

export const DomainListResponse = t.Object({
  domains: t.Array(ListedDomainResponse),
  counts: DomainCountsResponse,
  nextCursor: t.Union([t.String(), t.Null()]),
})

export function toDomainResponse(domain: Domain): Static<typeof DomainResponse> {
  return {
    id: domain.id,
    name: domain.nameAscii,
    unicodeName: domain.nameUnicode,
    archived: domain.archivedAt !== null,
    createdAt: domain.createdAt.toISOString(),
  }
}

export function toDomainListResponse(page: DomainsPage): Static<typeof DomainListResponse> {
  return {
    domains: page.domains.map(toListedDomainResponse),
    counts: page.counts,
    nextCursor: page.nextCursor,
  }
}

function toListedDomainResponse(listed: ListedDomain): Static<typeof ListedDomainResponse> {
  return {
    ...toDomainResponse(listed.domain),
    status: listed.status,
    claimId: listed.claimId,
    verificationId: listed.verificationId,
    claimStartedAt: instant(listed.claimStartedAt),
    claimEndedAt: instant(listed.claimEndedAt),
  }
}

const instant = (value: Date | null) => (value === null ? null : value.toISOString())
