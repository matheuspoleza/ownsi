import type { Challenge, Diagnosis } from "./diagnosis.ts"

export const VERIFICATION_METHODS = ["dns_txt"] as const

export type VerificationMethodId = (typeof VERIFICATION_METHODS)[number]

export const ATTEMPT_TRIGGERS = ["first_check", "scheduled", "requested"] as const

export type AttemptTrigger = (typeof ATTEMPT_TRIGGERS)[number]

export type AttemptOutcome =
  | { readonly type: "found"; readonly value: string }
  | { readonly type: "absent"; readonly diagnosis: Diagnosis }
  | { readonly type: "unresolvable"; readonly resolvers: readonly string[] }

export type ChallengeRequest = Challenge & {
  readonly previousTokens: readonly string[]
}

export type VerificationAttempt = {
  readonly id: string
  readonly verificationId: string
  readonly trigger: AttemptTrigger
  readonly outcome: AttemptOutcome
  readonly latencyMs: number | null
  readonly at: Date
}

export type CheckChallenge = (
  method: VerificationMethodId,
  challenge: ChallengeRequest,
  signal?: AbortSignal,
) => Promise<AttemptOutcome>
