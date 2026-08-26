import type { VerificationStatus } from "../../api/verification.api.ts"

/** The next thing the person can do, in the row's own words. Null means nothing to do. */
export const NEXT_STEPS: Record<VerificationStatus, string | null> = {
  checking: "Nothing, the first check is running",
  propagating: "Nothing, resolvers are catching up",
  needs_attention: "Add the TXT record",
  proved: null,
  exhausted: "Claim it again",
  stopped: "Claim it again",
}

export const UNCLAIMED_NEXT_STEP = "Claim it"

export const EXPIRED_NEXT_STEP = "Claim it again"

/** Four inks so a wallet of proofs reads as a wallet and not as a list. */
export const TICKET_INKS = ["#0F5C36", "#262E78", "#5A2A6A", "#0D4F5E"] as const

/** The name the empty state types in for you, so the record and the proof have something to read. */
export const PREVIEW_DOMAIN = "yourcompany.com"

export const PREVIEW_RECORD = {
  host: `_ownsi-challenge.${PREVIEW_DOMAIN}`,
  type: "TXT",
  value: "ownsi_v1_…",
} as const
