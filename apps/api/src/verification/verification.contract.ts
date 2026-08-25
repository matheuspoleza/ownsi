export type {
  AttemptOutcome,
  ChallengeRequest,
  CheckChallenge,
  VerificationMethodId,
} from "./domain/attempt.ts"
export type {
  AbsentAnswer,
  Challenge,
  Diagnosis,
  DiagnosisCode,
  Explanation,
} from "./domain/diagnosis.ts"
export {
  CHALLENGE_LABEL,
  CHALLENGE_TOKEN_PREFIX,
  challengeHost,
  DIAGNOSIS_CODES,
  explain,
} from "./domain/diagnosis.ts"
