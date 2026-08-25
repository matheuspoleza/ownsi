import type { ClaimState } from "../../api/claim.api.ts"
import type { VerificationStatus } from "../../api/verification.api.ts"

export const LIVE_STATUSES: ReadonlySet<VerificationStatus> = new Set([
  "checking",
  "propagating",
  "needs_attention",
])

/** The next thing the person can do, in the row's own words. Nothing means nothing to do. */
export const NEXT_STEPS: Record<VerificationStatus, string> = {
  checking: "Nothing, the first check is running",
  propagating: "Nothing, resolvers are catching up",
  needs_attention: "Create the record",
  proved: "Nothing, it is proved",
  exhausted: "Claim it again",
  stopped: "Claim it again",
}

/** What the list says a name's last attempt came to. */
export const CLAIM_STATE_LABELS: Record<ClaimState, string> = {
  pending: "In progress",
  proved: "Proved",
  expired: "Expired",
  canceled: "Canceled",
}

/** Four inks so a wallet of proofs reads as a wallet and not as a list. */
export const TICKET_INKS = ["#0F5C36", "#262E78", "#5A2A6A", "#0D4F5E"] as const
