import { err, ok, type Result } from "../../shared/result.ts"
import type { VerificationAttempt } from "../domain/attempt.ts"
import type { VerificationRepository } from "../domain/ports.ts"
import type { VerificationNotFound } from "./get-verification.query.ts"

export const MOST_ATTEMPTS_LISTED = 100

export type ListAttemptsInput = {
  readonly userId: string
  readonly verificationId: string
}

export type ListAttempts = (
  input: ListAttemptsInput,
) => Promise<Result<readonly VerificationAttempt[], VerificationNotFound>>

export function listAttempts(verifications: VerificationRepository): ListAttempts {
  return async ({ userId, verificationId }) => {
    const found = await verifications.findById(verificationId)
    if (found === null || found.ownerId !== userId) return err({ type: "not_found" })

    return ok(await verifications.listAttempts(verificationId, MOST_ATTEMPTS_LISTED))
  }
}
