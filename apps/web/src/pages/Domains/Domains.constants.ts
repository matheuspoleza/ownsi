import type { VerificationStatus } from "../../api/verification.api.ts"
import type { DomainStatus } from "../../lib/status.constants.ts"

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

/** One request's worth of rows. The list keeps every batch it has read and asks for the next. */
export const DOMAINS_PER_BATCH = 20

/** Past this many domains the panel stands beside the table rather than under it. */
export const ROWS_BEFORE_RAIL = 5

/** What the panel offers to do with the domain on screen. One imperative per state. */
export const PANEL_ACTIONS: Record<DomainStatus, string> = {
  unclaimed: "claim it",
  pending: "add the record",
  checking: "watch it check",
  proved: "open the proof",
  expired: "claim it again",
  canceled: "claim it again",
  archived: "claim it again",
}

export const HELD_CAPTION = "A proof of ownership, yours to share."

/** Off the list, with its links taken back — and the proof itself untouched. Both, in one line. */
export const ARCHIVED_CAPTION = "Archived. The proof stands; its public links were taken back."

export const AWAITED_CAPTION = "A proof of ownership, once the record reads back."
