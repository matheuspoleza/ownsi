import type { Step, VerificationRepository } from "../domain/ports.ts"
import type { RunVerification } from "./run-verification.use-case.ts"

export type VerifyUntilDeadlineInput = {
  readonly verificationId: string
}

export type VerifyUntilDeadline = (input: VerifyUntilDeadlineInput, step: Step) => Promise<void>

export type VerifyUntilDeadlineDeps = {
  readonly verifications: VerificationRepository
  readonly runVerification: RunVerification
}

export function verifyUntilDeadline(deps: VerifyUntilDeadlineDeps): VerifyUntilDeadline {
  return async ({ verificationId }, step) => {
    let runAt = await step.run("first-run-at", async () => {
      const found = await deps.verifications.findById(verificationId)
      return found?.nextRunAt?.toISOString() ?? null
    })

    for (let round = 0; runAt !== null; round += 1) {
      await step.sleepUntil(`until-run-${round}`, new Date(runAt))

      runAt = await step.run(`run-${round}`, async () => {
        const ran = await deps.runVerification({
          verificationId,
          trigger: round === 0 ? "first_check" : "scheduled",
        })
        return ran.ok ? (ran.value.nextRunAt?.toISOString() ?? null) : null
      })
    }
  }
}
