import type { VerificationStatus } from "../../api/verification.api.ts"
import type { DomainStatus } from "../../lib/status.constants.ts"

export type Tone = "idle" | "running" | "success" | "warning" | "error"

/** The statuses a verification can still leave on its own, so the page keeps asking. */
export const LIVE_STATUSES: ReadonlySet<VerificationStatus> = new Set([
  "checking",
  "propagating",
  "needs_attention",
])

/** How loudly the page speaks about each state: the ground the message block stands on. */
export const STATUS_TONES: Record<DomainStatus, Tone> = {
  unclaimed: "idle",
  pending: "error",
  checking: "running",
  proved: "success",
  expired: "warning",
  canceled: "idle",
}

export type StepTone = Exclude<Tone, "warning">

export type StepCopy = Record<StepTone, string>

export const STEP_LABELS: readonly StepCopy[] = [
  { idle: "Nameservers", running: "Checking DNS", success: "DNS connected", error: "No answer" },
  { idle: "TXT", running: "Reading TXT", success: "TXT found", error: "TXT not found" },
  { idle: "Token", running: "Token", success: "Token matches", error: "Token mismatch" },
]

export interface MessageCopy {
  headline: string
  body: string
}

export const NO_CLAIM_MESSAGE: MessageCopy = {
  headline: "Nothing is claiming this name yet",
  body: "Opening a claim mints a token bound to this account and hands you the record to create.",
}

export const CHECKING_MESSAGE: MessageCopy = {
  headline: "The first check is running",
  body: "This usually takes a few seconds.",
}

export const PROVED_MESSAGE: MessageCopy = {
  headline: "You proved ownership",
  body: "The date describes that moment, so nothing re-checks it and nothing takes it back. The record has done its job — remove it from the zone whenever you like.",
}

export const EXPIRED_MESSAGE: MessageCopy = {
  headline: "The window closed",
  body: "Seven days passed without a readable record. A fresh date needs a fresh demonstration, so claiming again issues a new token.",
}

export const CANCELED_MESSAGE: MessageCopy = {
  headline: "You ended this claim",
  body: "Its token stops being accepted, so the record left in the zone is inert. Claiming again issues a new one.",
}

export const DIAGNOSTICS_URL = "https://ownsi.dev/docs/diagnostics/catalogue"

export const DISPUTES_URL = "https://ownsi.dev/docs/concepts/claim-lifecycle#coexistence"

export const DNS_SNAPSHOT_TIP =
  "What your DNS looked like on the day we read it. We do not watch it after that, so this is " +
  "a snapshot, not a live view."

export const COEXISTENCE_TIP =
  "Both accounts published a valid record, so both proofs are live. ownsi does not pick a " +
  "winner — this list only says who got there first."
