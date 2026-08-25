import type { AttemptOutcome } from "../../verification/verification.contract.ts"
import type { AccountDomain, NewAccountDomain } from "./account-domain.ts"
import type { ClaimChallenge } from "./claim.ts"
import type { Coexistence } from "./claim-lifecycle.ts"
import type { Domain } from "./domain.ts"
import type { ClaimNotice, NoticeKind } from "./schedule.ts"

export type AccountDomainRepository = {
  readonly findByName: (userId: string, nameAscii: string) => Promise<AccountDomain | null>
  readonly findById: (userId: string, domainId: string) => Promise<AccountDomain | null>
  readonly listByUser: (userId: string) => Promise<readonly AccountDomain[]>
  readonly save: (record: AccountDomain) => Promise<void>
}

export type CheckClaim = (challenge: ClaimChallenge) => Promise<AttemptOutcome>

export type ClaimAddress = {
  readonly userId: string
  readonly domainId: string
}

/** Returns when the claim should be looked at again, or null once it is history. */
export type CheckWhenDue = (claim: ClaimAddress) => Promise<Date | null>

export type ScheduledClaim = ClaimAddress & {
  readonly claimId: string
  readonly checkAt: Date
}

export type ScheduleClaim = (claim: ScheduledClaim) => Promise<void>

export type ClaimAnnouncement = ClaimAddress & {
  readonly notice: ClaimNotice
  readonly claimId: string
  readonly domain: string
  readonly token: string
}

export type Recipient = {
  readonly email: string
  readonly name: string
}

export type FindRecipient = (userId: string) => Promise<Recipient | null>

export type SentNotices = {
  readonly lastSent: (claimId: string, kind: NoticeKind) => Promise<Date | null>
  readonly record: (claimId: string, kind: NoticeKind, at: Date) => Promise<void>
}

export type Claimant = ClaimAddress & {
  readonly claimId: string
  readonly token: string
}

export type FindOtherClaimants = (
  nameAscii: string,
  exceptUserId: string,
) => Promise<readonly Claimant[]>

export type AnnounceClaim = (announcement: ClaimAnnouncement) => Promise<void>

export type FindCoexistence = (domain: Domain, userId: string) => Promise<Coexistence | null>

export type GenerateToken = () => string

export type GenerateId = (prefix: string) => string

export type StartDomain = (params: NewAccountDomain) => AccountDomain
