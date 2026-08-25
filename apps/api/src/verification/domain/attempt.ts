import type { Diagnosis } from "./diagnosis.ts"

export const VERIFICATION_METHODS = ["dns_txt"] as const

export type VerificationMethodId = (typeof VERIFICATION_METHODS)[number]

export type AttemptTrigger = "first_check" | "scheduled" | "requested"

export type AttemptOutcome =
  | { readonly type: "found"; readonly value: string }
  | { readonly type: "absent"; readonly diagnosis: Diagnosis }
  | { readonly type: "unresolvable"; readonly resolvers: readonly string[] }

export type VerificationAttempt = {
  readonly claimId: string
  readonly method: VerificationMethodId
  readonly trigger: AttemptTrigger
  readonly outcome: AttemptOutcome
  readonly at: Date
}

export type ChallengeRequest = {
  readonly method: VerificationMethodId
  readonly domain: string
  readonly token: string
  readonly previousTokens: readonly string[]
}

export type CheckChallenge = (
  request: ChallengeRequest,
  signal?: AbortSignal,
) => Promise<AttemptOutcome>
