import type { DomainName } from "../../shared/domain-name.ts"

export type Domain = {
  readonly id: string
  readonly userId: string
  readonly nameAscii: string
  readonly nameUnicode: string
  readonly archivedAt: Date | null
  readonly createdAt: Date
}

export type NewDomain = {
  readonly id: string
  readonly userId: string
  readonly name: DomainName
  readonly createdAt: Date
}

export function nameDomain({ id, userId, name, createdAt }: NewDomain): Domain {
  return {
    id,
    userId,
    nameAscii: name.ascii,
    nameUnicode: name.unicode,
    archivedAt: null,
    createdAt,
  }
}

export function archive(domain: Domain, at: Date): Domain {
  return { ...domain, archivedAt: domain.archivedAt ?? at }
}

export function unarchive(domain: Domain): Domain {
  return { ...domain, archivedAt: null }
}

export function isArchived(domain: Domain): boolean {
  return domain.archivedAt !== null
}
