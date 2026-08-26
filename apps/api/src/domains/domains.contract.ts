import type { EventEnvelope } from "../shared/bus.ts"
import { type Domain, isArchived } from "./domain/domain.ts"

export type DomainRef = {
  readonly id: string
  readonly userId: string
  readonly nameAscii: string
  readonly nameUnicode: string
  readonly archived: boolean
}

export function domainRef(domain: Domain): DomainRef {
  return {
    id: domain.id,
    userId: domain.userId,
    nameAscii: domain.nameAscii,
    nameUnicode: domain.nameUnicode,
    archived: isArchived(domain),
  }
}

export type DomainShelved = {
  readonly userId: string
  readonly domainId: string
}

export type DomainEvent =
  | EventEnvelope<"domains/domain.archived", DomainShelved>
  | EventEnvelope<"domains/domain.unarchived", DomainShelved>
