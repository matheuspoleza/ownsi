import type { AttemptData, Verification } from "@ownsi/sdk"
import { ownsi } from "./ownsi.client.ts"

export type {
  AttemptData,
  Diagnosis,
  Verification,
  VerificationStatus,
  WaitEstimate,
} from "@ownsi/sdk"

export const verificationKey = (verificationId: string | null) =>
  ["verification", verificationId] as const

/** Keyed on the last run too, so a fresh attempt invalidates the timeline on its own. */
export const attemptsKey = (verificationId: string | null, lastRunAt: string | null) =>
  ["attempts", verificationId, lastRunAt] as const

export const readVerification = (verificationId: string): Promise<Verification> =>
  ownsi.verifications.get(verificationId)

export const runVerification = (verification: Verification): Promise<Verification> =>
  verification.run()

export const listAttempts = (verification: Verification): Promise<readonly AttemptData[]> =>
  verification.attempts()
