import type {
  CheckOutcome,
  ClaimStatus,
  Coexistence,
  WaitEstimate,
} from "../../shared/claim-status.ts"
import { CHALLENGE_LABEL, challengeHost, type Diagnosis } from "../../shared/diagnosis.ts"

export type Claim = {
  readonly id: string
  readonly userId: string
  readonly domain: string
  readonly token: string
  readonly status: ClaimStatus
  readonly lastOutcome: CheckOutcome | null
  readonly diagnosis: Diagnosis | null
  readonly waitEstimate: WaitEstimate | null
  readonly firstVerifiedAt: Date | null
  readonly lastConfirmedAt: Date | null
  readonly coexistence: Coexistence | null
  readonly createdAt: Date
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
  readonly domain: string
  readonly token: string
  readonly createdAt: Date
}

const FIRST_CHECK_SECONDS = 30

export function challengeRecord(claim: Claim): ChallengeRecord {
  return {
    host: CHALLENGE_LABEL,
    name: challengeHost(claim.domain),
    type: "TXT",
    value: claim.token,
  }
}

export function startPending(params: NewClaim): Claim {
  return {
    ...params,
    status: "pending",
    lastOutcome: null,
    diagnosis: null,
    waitEstimate: { reason: "first_check", secondsRemaining: FIRST_CHECK_SECONDS },
    firstVerifiedAt: null,
    lastConfirmedAt: null,
    coexistence: null,
  }
}

export function archive(claim: Claim): Claim {
  return { ...claim, status: "archived", waitEstimate: null }
}

export function reactivate(claim: Claim): Claim {
  return {
    ...claim,
    status: "pending",
    diagnosis: null,
    waitEstimate: { reason: "first_check", secondsRemaining: FIRST_CHECK_SECONDS },
  }
}

export function resume(claim: Claim): Claim {
  return claim.status === "paused" ? reactivate(claim) : claim
}
