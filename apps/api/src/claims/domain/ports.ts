import type {
  ChallengeRequest,
  VerificationMethodId,
} from "../../verification/verification.contract.ts"
import type { Claim, OpenClaim } from "./claim.ts"
import type { Coexistence } from "./coexistence.ts"
import type { ClaimNotice, NoticeKind } from "./notice.ts"

export type ClaimRepository = {
  readonly findById: (claimId: string) => Promise<Claim | null>
  readonly findOpenByDomain: (domainId: string) => Promise<OpenClaim | null>
  readonly listByUser: (userId: string) => Promise<readonly Claim[]>
  readonly listByDomain: (domainId: string) => Promise<readonly Claim[]>
  readonly save: (claim: Claim) => Promise<void>
}

export type ClaimedDomain = {
  readonly id: string
  readonly userId: string
  readonly nameAscii: string
  readonly nameUnicode: string
}

export type FindDomain = (input: {
  readonly userId: string
  readonly domainId: string
}) => Promise<ClaimedDomain | null>

export type FindDomains = (userId: string) => Promise<readonly ClaimedDomain[]>

/** Hands the process the deadline the claim computed, and answers with its id at once. */
export type StartVerifying = (input: {
  readonly subjectId: string
  readonly ownerId: string
  readonly method: VerificationMethodId
  readonly challenge: ChallengeRequest
  readonly deadline: Date
}) => Promise<string | null>

export type StopVerifying = (input: { readonly verificationId: string }) => Promise<void>

export type Claimant = {
  readonly userId: string
  readonly domainId: string
  readonly claimId: string
  readonly token: string
}

export type FindOtherClaimants = (
  nameAscii: string,
  exceptUserId: string,
) => Promise<readonly Claimant[]>

export type FindCoexistence = (
  nameAscii: string,
  exceptUserId: string,
) => Promise<Coexistence | null>

export type Recipient = {
  readonly email: string
  readonly name: string
}

export type FindRecipient = (userId: string) => Promise<Recipient | null>

export type SentNotices = {
  readonly lastSent: (claimId: string, kind: NoticeKind) => Promise<Date | null>
  readonly record: (claimId: string, kind: NoticeKind, at: Date) => Promise<void>
}

export type ClaimAnnouncement = {
  readonly notice: ClaimNotice
  readonly claimId: string
  readonly userId: string
  readonly domainId: string
  readonly domain: string
  readonly token: string
}

export type SendNotice = (announcement: ClaimAnnouncement) => Promise<void>

export type GenerateId = (prefix: string) => string

export type GenerateToken = () => string
