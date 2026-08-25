import type { ClaimState } from "../../api/claim.api.ts"
import type { VerificationStatus } from "../../api/verification.api.ts"

export type Tone = "idle" | "running" | "success" | "warning" | "error"

export interface StatusPill {
  label: string
  tone: Tone
}

/** The word the page puts on a domain, derived from the claim and the process behind it. */
export const CLAIM_STATUS_PILLS: Record<Exclude<ClaimState, "pending">, StatusPill> = {
  proved: { label: "Verified", tone: "success" },
  expired: { label: "Expired", tone: "warning" },
  canceled: { label: "Canceled", tone: "idle" },
}

export const RUNNING_STATUS_PILLS: Record<VerificationStatus, StatusPill> = {
  checking: { label: "Checking", tone: "running" },
  propagating: { label: "Propagating", tone: "warning" },
  needs_attention: { label: "Not verified", tone: "error" },
  proved: { label: "Verified", tone: "success" },
  exhausted: { label: "Expired", tone: "warning" },
  stopped: { label: "Canceled", tone: "idle" },
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
