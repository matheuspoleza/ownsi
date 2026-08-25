import { err, ok, type Result } from "../../shared/result.ts"
import type { StopSchedule, VerificationRepository } from "../domain/ports.ts"
import { stop, type Verification } from "../domain/verification.ts"

export type StopVerificationInput = {
  readonly verificationId: string
}

export type StopVerificationError = { readonly type: "not_found" }

export type StopVerification = (
  input: StopVerificationInput,
) => Promise<Result<Verification, StopVerificationError>>

export type StopVerificationDeps = {
  readonly verifications: VerificationRepository
  readonly stopSchedule: StopSchedule
}

export function stopVerification(deps: StopVerificationDeps): StopVerification {
  return async ({ verificationId }) => {
    const found = await deps.verifications.findById(verificationId)
    if (found === null) return err({ type: "not_found" })
    if (found.status !== "running") return ok(found)

    const stopped = stop(found)
    await deps.verifications.save(stopped)
    await deps.stopSchedule({ verificationId })

    return ok(stopped)
  }
}
