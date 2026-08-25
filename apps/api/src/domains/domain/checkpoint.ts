import type { AttemptOutcome, Diagnosis } from "../../verification/verification.contract.ts"
import { type Claim, end, type OpenClaim, secondsAfter } from "./claim.ts"
import type { WaitEstimate } from "./claim-lifecycle.ts"
import { type ClaimNotice, intervalSeconds, noticesBetween } from "./schedule.ts"

export type Checkpoint = {
  readonly claim: Claim
  readonly notices: readonly ClaimNotice[]
}

const MILLISECONDS_IN_SECOND = 1_000

export function applyAttempt(claim: OpenClaim, outcome: AttemptOutcome, now: Date): Checkpoint {
  switch (outcome.type) {
    case "found":
      return {
        claim: end({ ...claim, lastCheck: { outcome: "found", at: now } }, "proved", now),
        notices: [{ kind: "proved", provedAt: now }],
      }
    case "unresolvable":
      return { claim: backOff(claim, now), notices: [] }
    case "absent":
      return {
        claim: keepWaiting(claim, outcome.diagnosis, now),
        notices: noticesBetween(claim.createdAt, lastMoved(claim), now, outcome.diagnosis),
      }
  }
}

export function expire(claim: OpenClaim, now: Date): Checkpoint {
  return { claim: end(claim, "expired", now), notices: [] }
}

export function isDue(claim: OpenClaim, now: Date): boolean {
  return now >= claim.nextCheckAt
}

function backOff(claim: OpenClaim, now: Date): OpenClaim {
  const consecutiveFailures = claim.consecutiveFailures + 1

  return {
    ...claim,
    consecutiveFailures,
    nextCheckAt: wakeAt(claim, now, intervalSeconds(ageSeconds(claim, now), consecutiveFailures)),
  }
}

function keepWaiting(claim: OpenClaim, diagnosis: Diagnosis, now: Date): OpenClaim {
  const seconds = Math.max(cacheSeconds(diagnosis), intervalSeconds(ageSeconds(claim, now), 0))

  return {
    ...claim,
    lastCheck: { outcome: "absent", diagnosis, at: now },
    waitEstimate: waitFor(diagnosis, seconds),
    nextCheckAt: wakeAt(claim, now, seconds),
    consecutiveFailures: 0,
  }
}

function cacheSeconds(diagnosis: Diagnosis): number {
  return diagnosis.code === "negative_cache" ? diagnosis.observed.secondsRemaining : 0
}

function waitFor(diagnosis: Diagnosis, secondsRemaining: number): WaitEstimate | null {
  return diagnosis.code === "negative_cache" ? { reason: "negative_cache", secondsRemaining } : null
}

function wakeAt(claim: OpenClaim, now: Date, seconds: number): Date {
  const at = secondsAfter(now, seconds)

  return at > claim.expiresAt ? claim.expiresAt : at
}

function ageSeconds(claim: OpenClaim, now: Date): number {
  return (now.getTime() - claim.createdAt.getTime()) / MILLISECONDS_IN_SECOND
}

function lastMoved(claim: OpenClaim): Date {
  return claim.lastCheck?.at ?? claim.createdAt
}
