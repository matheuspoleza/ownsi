import type { Domain } from "./domain.ts"

export type DomainRepository = {
  readonly findById: (domainId: string) => Promise<Domain | null>
  readonly findByName: (userId: string, nameAscii: string) => Promise<Domain | null>
  readonly listByUser: (userId: string) => Promise<readonly Domain[]>
  readonly save: (domain: Domain) => Promise<void>
  readonly remove: (domainId: string) => Promise<void>
}

export const DOMAIN_STATUSES = ["unclaimed", "pending", "proved", "expired", "canceled"] as const

export type DomainStatus = (typeof DOMAIN_STATUSES)[number]

export type ListedDomain = {
  readonly domain: Domain
  readonly status: DomainStatus
  readonly claimId: string | null
  readonly verificationId: string | null
  readonly claimStartedAt: Date | null
  readonly claimEndedAt: Date | null
}

export type DomainCounts = Readonly<Record<DomainStatus, number>> & {
  readonly archived: number
}

export type DomainPageRequest = {
  readonly userId: string
  /** Naming one finds it whether or not it is archived: a name is a lookup, not a browse. */
  readonly name: string | null
  readonly status: DomainStatus | null
  readonly archived: boolean
  readonly after: string | null
  readonly limit: number
}

export type DomainListing = {
  readonly listPage: (request: DomainPageRequest) => Promise<readonly ListedDomain[]>
  readonly countByStatus: (userId: string) => Promise<DomainCounts>
}

export type GenerateId = (prefix: string) => string
