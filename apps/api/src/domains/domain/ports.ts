import type { Domain } from "./domain.ts"

export type DomainRepository = {
  readonly findById: (domainId: string) => Promise<Domain | null>
  readonly findByName: (userId: string, nameAscii: string) => Promise<Domain | null>
  readonly listByUser: (userId: string) => Promise<readonly Domain[]>
  readonly save: (domain: Domain) => Promise<void>
  readonly remove: (domainId: string) => Promise<void>
}

export type GenerateId = (prefix: string) => string
