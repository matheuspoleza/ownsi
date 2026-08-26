import type { ClaimDetail } from "../../api/claim.api.ts"
import type { Diagnosis, Verification } from "../../api/verification.api.ts"
import { claimStanding, domainStatus } from "../../lib/status.utils.ts"
import {
  CANCELED_MESSAGE,
  CHECKING_MESSAGE,
  EXPIRED_MESSAGE,
  type MessageCopy,
  NO_CLAIM_MESSAGE,
  PROVED_MESSAGE,
  STATUS_TONES,
  STEP_LABELS,
  type StepTone,
  type Tone,
} from "./DomainDetail.constants.ts"

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
  STATUS_TONES[domainStatus(claimStanding(claim), verification)]

export interface Holder {
  email: string
  provedAt: string
  ordinal: string
  isYou: boolean
}

const ORDINALS = ["1st", "2nd", "3rd", "4th"] as const

const ordinalAt = (index: number): string => ORDINALS[index] ?? `${index + 1}th`

/**
 * Everyone whose proof stands on this name, oldest first. Empty when nobody else got there:
 * a list of one is a fact about the page, not about coexistence.
 */
export const holdersOf = (
  claim: ClaimDetail | null,
  accountEmail: string | null,
): readonly Holder[] => {
  if (claim === null || claim.state !== "proved" || claim.endedAt === null) return []
  if (claim.coexistence === null || accountEmail === null) return []

  const both = [
    { email: accountEmail, provedAt: claim.endedAt, isYou: true },
    { email: claim.coexistence.maskedEmail, provedAt: claim.coexistence.provedAt, isYou: false },
  ].sort((one, other) => (one.provedAt < other.provedAt ? -1 : 1))

  return both.map((holder, index) => ({ ...holder, ordinal: ordinalAt(index) }))
}
