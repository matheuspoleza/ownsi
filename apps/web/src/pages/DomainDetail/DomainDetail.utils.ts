import type { ClaimDetail } from "../../api/claim.api.ts"
import type { Diagnosis, Verification } from "../../api/verification.api.ts"
import {
  CANCELED_MESSAGE,
  CHECKING_MESSAGE,
  CLAIM_STATUS_PILLS,
  EXPIRED_MESSAGE,
  type MessageCopy,
  NO_CLAIM_MESSAGE,
  PROVED_MESSAGE,
  RUNNING_STATUS_PILLS,
  STEP_LABELS,
  type StatusPill,
  type StepTone,
  type Tone,
} from "./DomainDetail.constants.ts"

const IDLE_PILL: StatusPill = { label: "No claim", tone: "idle" }

export const statusPill = (
  claim: ClaimDetail | null,
  verification: Verification | null,
): StatusPill => {
  if (claim === null) return IDLE_PILL
  if (claim.state !== "pending") return CLAIM_STATUS_PILLS[claim.state]
  if (verification === null) return RUNNING_STATUS_PILLS.checking

  return RUNNING_STATUS_PILLS[verification.status]
}

/** The delegation itself failed, so the record was never the problem. */
const DELEGATION_CODES: ReadonlySet<Diagnosis["code"]> = new Set([
  "lame_delegation",
  "servfail",
  "unresolvable" as Diagnosis["code"],
])

export interface Step {
  label: string
  tone: StepTone
}

const stepAt = (index: number, tone: StepTone): Step => ({
  label: STEP_LABELS[index]?.[tone] ?? "",
  tone,
})

export const railSteps = (
  claim: ClaimDetail | null,
  verification: Verification | null,
): readonly Step[] => {
  if (claim?.state === "proved") {
    return [stepAt(0, "success"), stepAt(1, "success"), stepAt(2, "success")]
  }

  if (claim === null || claim.state !== "pending") {
    return [stepAt(0, "idle"), stepAt(1, "idle"), stepAt(2, "idle")]
  }

  if (verification === null || verification.lastOutcome === null) {
    return [stepAt(0, "running"), stepAt(1, "idle"), stepAt(2, "idle")]
  }

  const { diagnosis } = verification
  if (diagnosis === null) return [stepAt(0, "success"), stepAt(1, "running"), stepAt(2, "idle")]
  if (DELEGATION_CODES.has(diagnosis.code)) {
    return [stepAt(0, "error"), stepAt(1, "idle"), stepAt(2, "idle")]
  }
  if (diagnosis.code === "negative_cache") {
    return [stepAt(0, "success"), stepAt(1, "success"), stepAt(2, "running")]
  }

  return [stepAt(0, "success"), stepAt(1, "error"), stepAt(2, "idle")]
}

/**
 * A diagnosis carries its own sentences — `apps/api` owns that copy and the docs read it —
 * so the page never restates one. Everything else is the page's own.
 */
export const verificationMessage = (
  claim: ClaimDetail | null,
  verification: Verification | null,
): MessageCopy => {
  if (claim === null) return NO_CLAIM_MESSAGE
  if (claim.state === "proved") return PROVED_MESSAGE
  if (claim.state === "expired") return EXPIRED_MESSAGE
  if (claim.state === "canceled") return CANCELED_MESSAGE

  const diagnosis = verification?.diagnosis ?? null
  if (diagnosis === null) return CHECKING_MESSAGE

  return { headline: diagnosis.cause, body: diagnosis.fix }
}

export const messageTone = (claim: ClaimDetail | null, verification: Verification | null): Tone =>
  statusPill(claim, verification).tone
