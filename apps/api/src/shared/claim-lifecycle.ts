import type { DiagnosisCode } from "./diagnosis.ts"

export const CLAIM_STATES = ["pending", "proved", "expired", "canceled"] as const

export type ClaimState = (typeof CLAIM_STATES)[number]

export type EndedState = Exclude<ClaimState, "pending">

export const CLAIM_STATUSES = [
  "pending",
  "propagating",
  "needs_attention",
  "proved",
  "expired",
  "canceled",
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export type PendingStatus = Extract<ClaimStatus, "pending" | "propagating" | "needs_attention">

export const CHECK_OUTCOMES = ["found", "absent", "unresolvable"] as const

export type CheckOutcome = (typeof CHECK_OUTCOMES)[number]

export type WaitReason = "first_check" | "negative_cache" | "provider_publishing"

export type WaitEstimate = {
  readonly reason: WaitReason
  readonly secondsRemaining: number
}

export type Coexistence = {
  readonly maskedEmail: string
  readonly provedAt: string
}

export const CLAIM_WINDOW_DAYS = 7

const WHILE_PENDING: Record<DiagnosisCode, Exclude<PendingStatus, "pending">> = {
  domain_appended: "needs_attention",
  record_at_apex: "needs_attention",
  foreign_token: "needs_attention",
  value_formatted: "needs_attention",
  no_matching_record: "needs_attention",
  cname_conflict: "needs_attention",
  record_absent: "needs_attention",
  record_on_www: "needs_attention",
  not_published: "needs_attention",
  negative_cache: "propagating",
  servfail: "needs_attention",
  lame_delegation: "needs_attention",
}

export function statusWhilePending(code: DiagnosisCode): PendingStatus {
  return WHILE_PENDING[code]
}
