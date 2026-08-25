import type { EventEnvelope } from "../shared/bus.ts"

export type DomainRef = {
  readonly id: string
  readonly userId: string
  readonly nameAscii: string
  readonly nameUnicode: string
}

export type DomainArchived = {
  readonly userId: string
  readonly domainId: string
}

export type DomainEvent = EventEnvelope<"domains/domain.archived", DomainArchived>
