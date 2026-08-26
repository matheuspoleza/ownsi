import type { EventEnvelope } from "../shared/bus.ts"
import type { Diagnosis } from "./domain/diagnosis.ts"

export type {
  AttemptOutcome,
  AttemptTrigger,
  ChallengeRequest,
  VerificationMethodId,
} from "./domain/attempt.ts"
export { ATTEMPT_TRIGGERS, VERIFICATION_METHODS } from "./domain/attempt.ts"
export type {
  AbsentAnswer,
  Challenge,
  Diagnosis,
  DiagnosisCode,
  Explanation,
  WaitsOn,
} from "./domain/diagnosis.ts"
export {
  awaits,
  CHALLENGE_LABEL,
  CHALLENGE_TOKEN_PREFIX,
  challengeHost,
  DIAGNOSIS_CODES,
  explain,
} from "./domain/diagnosis.ts"

export type AttemptSucceeded = {
  readonly verificationId: string
  readonly subjectId: string
  readonly ownerId: string
  readonly at: Date
}

export type AttemptFailed = {
  readonly verificationId: string
  readonly subjectId: string
  readonly ownerId: string
  readonly diagnosis: Diagnosis
  readonly previousDiagnosis: Diagnosis | null
  readonly since: Date
  readonly at: Date
}

export type VerificationExhausted = {
  readonly verificationId: string
  readonly subjectId: string
  readonly ownerId: string
  readonly at: Date
}

export type VerificationEvent =
  | EventEnvelope<"verification/attempt.succeeded", AttemptSucceeded>
  | EventEnvelope<"verification/attempt.failed", AttemptFailed>
  | EventEnvelope<"verification/exhausted", VerificationExhausted>
