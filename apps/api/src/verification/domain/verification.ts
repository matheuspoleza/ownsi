import { secondsAfter, secondsBetween } from "../../shared/time.ts"
import type { AttemptOutcome, ChallengeRequest, VerificationMethodId } from "./attempt.ts"
import { FIRST_RUN_SECONDS, intervalSeconds } from "./backoff.ts"
import type { Diagnosis, DiagnosisCode } from "./diagnosis.ts"

export const VERIFICATION_STATUSES = ["running", "proved", "exhausted", "stopped"] as const

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const RUNNING_STATES = ["checking", "propagating", "needs_attention"] as const

export type RunningState = (typeof RUNNING_STATES)[number]

export type WaitReason = "first_check" | "negative_cache"

export type WaitEstimate = {
  readonly reason: WaitReason
  readonly secondsRemaining: number
}

export type LastRun =
  | { readonly outcome: "found"; readonly at: Date }
  | { readonly outcome: "absent"; readonly diagnosis: Diagnosis; readonly at: Date }
  | { readonly outcome: "unresolvable"; readonly at: Date }

export type Verification = {
  readonly id: string
  readonly subjectId: string
  readonly ownerId: string
  readonly method: VerificationMethodId
  readonly challenge: ChallengeRequest
  readonly status: VerificationStatus
  readonly deadline: Date
  readonly nextRunAt: Date | null
  readonly consecutiveFailures: number
  readonly lastRun: LastRun | null
  readonly createdAt: Date
}

export type NewVerification = {
  readonly id: string
  readonly subjectId: string
  readonly ownerId: string
  readonly method: VerificationMethodId
  readonly challenge: ChallengeRequest
  readonly deadline: Date
  readonly startedAt: Date
}

const WHILE_RUNNING: Record<DiagnosisCode, Exclude<RunningState, "checking">> = {
  domain_appended: "needs_attention",
  record_at_apex: "needs_attention",
  foreign_token: "needs_attention",
  expired_token: "needs_attention",
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

export function start(params: NewVerification): Verification {
  return {
    id: params.id,
    subjectId: params.subjectId,
    ownerId: params.ownerId,
    method: params.method,
    challenge: params.challenge,
    status: "running",
    deadline: params.deadline,
    nextRunAt: wakeAt(params.deadline, params.startedAt, FIRST_RUN_SECONDS),
    consecutiveFailures: 0,
    lastRun: null,
    createdAt: params.startedAt,
  }
}

export function isRunning(verification: Verification): boolean {
  return verification.status === "running"
}

export function isDue(verification: Verification, now: Date): boolean {
  return verification.nextRunAt !== null && now >= verification.nextRunAt
}

export function isPastDeadline(verification: Verification, now: Date): boolean {
  return now >= verification.deadline
}

export function recordAttempt(
  verification: Verification,
  outcome: AttemptOutcome,
  at: Date,
): Verification {
  switch (outcome.type) {
    case "found":
      return {
        ...verification,
        status: "proved",
        nextRunAt: null,
        consecutiveFailures: 0,
        lastRun: { outcome: "found", at },
      }
    case "absent": {
      const settled = {
        ...verification,
        consecutiveFailures: 0,
        lastRun: { outcome: "absent", diagnosis: outcome.diagnosis, at } as const,
      }
      const seconds = Math.max(
        cacheSeconds(outcome.diagnosis),
        intervalSeconds(ageSeconds(verification, at), 0),
      )
      return { ...settled, nextRunAt: wakeAt(verification.deadline, at, seconds) }
    }
    case "unresolvable": {
      const consecutiveFailures = verification.consecutiveFailures + 1
      const seconds = intervalSeconds(ageSeconds(verification, at), consecutiveFailures)
      return {
        ...verification,
        consecutiveFailures,
        nextRunAt: wakeAt(verification.deadline, at, seconds),
      }
    }
  }
}

export function exhaust(verification: Verification): Verification {
  return { ...verification, status: "exhausted", nextRunAt: null }
}

export function stop(verification: Verification): Verification {
  return { ...verification, status: "stopped", nextRunAt: null }
}

export function waitEstimate(verification: Verification, now: Date): WaitEstimate | null {
  const { nextRunAt, lastRun } = verification
  if (nextRunAt === null) return null

  const secondsRemaining = Math.max(0, Math.round(secondsBetween(now, nextRunAt)))
  if (lastRun === null) return { reason: "first_check", secondsRemaining }

  return lastRun.outcome === "absent" && lastRun.diagnosis.code === "negative_cache"
    ? { reason: "negative_cache", secondsRemaining }
    : null
}

export function runningState(verification: Verification): RunningState {
  const { lastRun } = verification
  return lastRun?.outcome === "absent" ? WHILE_RUNNING[lastRun.diagnosis.code] : "checking"
}

function cacheSeconds(diagnosis: Diagnosis): number {
  return diagnosis.code === "negative_cache" ? diagnosis.observed.secondsRemaining : 0
}

function wakeAt(deadline: Date, from: Date, seconds: number): Date {
  const at = secondsAfter(from, seconds)
  return at > deadline ? deadline : at
}

function ageSeconds(verification: Verification, now: Date): number {
  return secondsBetween(verification.createdAt, now)
}
