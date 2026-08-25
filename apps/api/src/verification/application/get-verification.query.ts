import { err, ok, type Result } from "../../shared/result.ts"
import type { VerificationRepository } from "../domain/ports.ts"
import type { Verification } from "../domain/verification.ts"

export type VerificationNotFound = { readonly type: "not_found" }

export type GetVerificationInput = {
  readonly userId: string
  readonly verificationId: string
}

export type GetVerification = (
  input: GetVerificationInput,
) => Promise<Result<Verification, VerificationNotFound>>

export function getVerification(verifications: VerificationRepository): GetVerification {
  return async ({ userId, verificationId }) => {
    const found = await verifications.findById(verificationId)

    return found === null || found.ownerId !== userId ? err({ type: "not_found" }) : ok(found)
  }
}
