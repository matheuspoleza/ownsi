import type { Diagnosis } from "../../verification/verification.contract.ts"
import { CHALLENGE_LABEL, challengeHost } from "../../verification/verification.contract.ts"
import type { ClaimStatus, EndedState, PendingStatus, WaitEstimate } from "./claim-lifecycle.ts"
import { CLAIM_WINDOW_DAYS, statusWhilePending } from "./claim-lifecycle.ts"
import type { Domain } from "./domain.ts"

export type LastCheck =
  | { readonly outcome: "found"; readonly at: Date }
  | { readonly outcome: "absent"; readonly diagnosis: Diagnosis; readonly at: Date }
  | { readonly outcome: "unresolvable"; readonly at: Date }

export type ClaimFacts = {
  readonly id: string
  readonly userId: string
  readonly domainId: string
  readonly token: string
  readonly lastCheck: LastCheck | null
  readonly createdAt: Date
}

export type OpenClaim = ClaimFacts & {
  readonly state: "pending"
  readonly expiresAt: Date
  readonly nextCheckAt: Date
  readonly consecutiveFailures: number
  readonly waitEstimate: WaitEstimate | null
}

export type EndedClaim = ClaimFacts & {
  readonly state: EndedState
  readonly endedAt: Date
}

export type Claim = OpenClaim | EndedClaim

export type ClaimChallenge = {
  readonly domain: string
  readonly token: string
  readonly previousTokens: readonly string[]
}

export type ChallengeRecord = {
  readonly host: string
  readonly name: string
  readonly type: "TXT"
  readonly value: string
}

export type NewClaim = {
  readonly id: string
  readonly userId: string
  readonly domainId: string
  readonly token: string
  readonly openedAt: Date
}

const FIRST_CHECK_SECONDS = 30
const MILLISECONDS_IN_DAY = 86_400_000
const MILLISECONDS_IN_SECOND = 1_000

export function openClaim(params: NewClaim): OpenClaim {
  return {
    id: params.id,
    userId: params.userId,
    domainId: params.domainId,
    token: params.token,
    state: "pending",
    lastCheck: null,
    waitEstimate: { reason: "first_check", secondsRemaining: FIRST_CHECK_SECONDS },
    expiresAt: daysAfter(params.openedAt, CLAIM_WINDOW_DAYS),
    nextCheckAt: secondsAfter(params.openedAt, FIRST_CHECK_SECONDS),
    consecutiveFailures: 0,
    createdAt: params.openedAt,
  }
}

export function daysAfter(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * MILLISECONDS_IN_DAY)
}

export function secondsAfter(instant: Date, seconds: number): Date {
  return new Date(instant.getTime() + seconds * MILLISECONDS_IN_SECOND)
}

export function isOpen(claim: Claim): claim is OpenClaim {
  return claim.state === "pending"
}

export function pendingStatus(claim: OpenClaim): PendingStatus {
  if (claim.lastCheck?.outcome !== "absent") return "pending"
  return statusWhilePending(claim.lastCheck.diagnosis.code)
}

export function claimStatus(claim: Claim): ClaimStatus {
  return isOpen(claim) ? pendingStatus(claim) : claim.state
}

export function provedAt(claim: Claim): Date | null {
  return claim.state === "proved" ? claim.endedAt : null
}

export function end(claim: OpenClaim, state: EndedState, at: Date): EndedClaim {
  return {
    id: claim.id,
    userId: claim.userId,
    domainId: claim.domainId,
    token: claim.token,
    lastCheck: claim.lastCheck,
    createdAt: claim.createdAt,
    state,
    endedAt: at,
  }
}

export function challengeRecords(claim: Claim, domain: Domain): readonly ChallengeRecord[] {
  if (!isOpen(claim)) return []

  return [
    {
      host: CHALLENGE_LABEL,
      name: challengeHost(domain.nameAscii),
      type: "TXT",
      value: claim.token,
    },
  ]
}
