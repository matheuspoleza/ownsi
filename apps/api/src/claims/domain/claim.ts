import { daysAfter } from "../../shared/time.ts"

export const CLAIM_STATES = ["pending", "proved", "expired", "canceled"] as const

export type ClaimState = (typeof CLAIM_STATES)[number]

export type EndedState = Exclude<ClaimState, "pending">

export const CLAIM_WINDOW_DAYS = 7

export type ClaimFacts = {
  readonly id: string
  readonly userId: string
  readonly domainId: string
  readonly token: string
  readonly verificationId: string | null
  readonly expiresAt: Date
  readonly createdAt: Date
}

export type OpenClaim = ClaimFacts & {
  readonly state: "pending"
}

export type EndedClaim = ClaimFacts & {
  readonly state: EndedState
  readonly endedAt: Date
}

export type Claim = OpenClaim | EndedClaim

export type NewClaim = {
  readonly id: string
  readonly userId: string
  readonly domainId: string
  readonly token: string
  readonly openedAt: Date
}

export function openClaim(params: NewClaim): OpenClaim {
  return {
    id: params.id,
    userId: params.userId,
    domainId: params.domainId,
    token: params.token,
    verificationId: null,
    state: "pending",
    expiresAt: daysAfter(params.openedAt, CLAIM_WINDOW_DAYS),
    createdAt: params.openedAt,
  }
}

export function isOpen(claim: Claim): claim is OpenClaim {
  return claim.state === "pending"
}

export function verifiedBy(claim: OpenClaim, verificationId: string): OpenClaim {
  return { ...claim, verificationId }
}

export function prove(claim: OpenClaim, at: Date): EndedClaim {
  return end(claim, "proved", at)
}

export function expire(claim: OpenClaim, at: Date): EndedClaim {
  return end(claim, "expired", at)
}

export function cancel(claim: OpenClaim, at: Date): EndedClaim {
  return end(claim, "canceled", at)
}

export function provedAt(claim: Claim): Date | null {
  return claim.state === "proved" ? claim.endedAt : null
}

function end(claim: OpenClaim, state: EndedState, at: Date): EndedClaim {
  return { ...claim, state, endedAt: at }
}
