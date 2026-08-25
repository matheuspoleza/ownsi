import type { DomainName } from "../../shared/domain-name.ts"

export type Domain = {
  readonly id: string
  readonly nameAscii: string
  readonly nameUnicode: string
  readonly createdAt: Date
}

export type NewDomain = {
  readonly id: string
  readonly name: DomainName
  readonly createdAt: Date
}

export function nameDomain({ id, name, createdAt }: NewDomain): Domain {
  return { id, nameAscii: name.ascii, nameUnicode: name.unicode, createdAt }
}
