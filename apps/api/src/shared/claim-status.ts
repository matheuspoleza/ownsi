export const CLAIM_STATUSES = [
  "pending",
  "propagating",
  "needs_attention",
  "paused",
  "proved",
  "archived",
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

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
