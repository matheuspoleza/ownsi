import type { Coexistence } from "../../shared/claim-lifecycle.ts"
import type { AccountDomain } from "./account-domain.ts"
import type { Domain } from "./domain.ts"

export type AccountDomainRepository = {
  readonly findByName: (userId: string, nameAscii: string) => Promise<AccountDomain | null>
  readonly findById: (userId: string, domainId: string) => Promise<AccountDomain | null>
  readonly listByUser: (userId: string) => Promise<readonly AccountDomain[]>
  readonly save: (record: AccountDomain) => Promise<void>
}

export type FindCoexistence = (domain: Domain, userId: string) => Promise<Coexistence | null>

export type GenerateToken = () => string

export type GenerateId = (prefix: string) => string

export type StartDomain = (params: NewAccountDomain) => AccountDomain

export type NewAccountDomain = {
  readonly userId: string
  readonly domain: Domain
  readonly claimId: string
  readonly token: string
  readonly now: Date
}
