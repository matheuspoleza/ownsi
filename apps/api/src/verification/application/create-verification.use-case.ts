import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { ChallengeRequest, VerificationMethodId } from "../domain/attempt.ts"
import type { GenerateId, ScheduleVerification, VerificationRepository } from "../domain/ports.ts"
import { start, type Verification } from "../domain/verification.ts"

export type CreateVerificationInput = {
  readonly subjectId: string
  readonly ownerId: string
  readonly method: VerificationMethodId
  readonly challenge: ChallengeRequest
  readonly deadline: Date
}

export type CreateVerificationError = { readonly type: "deadline_passed" }

export type CreateVerification = (
  input: CreateVerificationInput,
) => Promise<Result<Verification, CreateVerificationError>>

export type CreateVerificationDeps = {
  readonly verifications: VerificationRepository
  readonly schedule: ScheduleVerification
  readonly generateId: GenerateId
  readonly clock: Clock
}

export function createVerification(deps: CreateVerificationDeps): CreateVerification {
  return async (input) => {
    const startedAt = deps.clock()
    if (startedAt >= input.deadline) return err({ type: "deadline_passed" })

    const verification = start({ ...input, id: deps.generateId("vrf"), startedAt })
    await deps.verifications.save(verification)

    if (verification.nextRunAt !== null) {
      await deps.schedule({ verificationId: verification.id, runAt: verification.nextRunAt })
    }

    return ok(verification)
  }
}
