import type { Publish } from "../../shared/bus.ts"
import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { AttemptTrigger, CheckChallenge } from "../domain/attempt.ts"
import type { GenerateId, VerificationRepository } from "../domain/ports.ts"
import {
  exhaust,
  isPastDeadline,
  recordAttempt,
  type Verification,
} from "../domain/verification.ts"
import type { VerificationEvent } from "../verification.contract.ts"

export type RunVerificationInput = {
  readonly verificationId: string
  readonly trigger: AttemptTrigger
}

export type RunVerificationError = { readonly type: "not_found" } | { readonly type: "not_running" }

export type RunVerification = (
  input: RunVerificationInput,
) => Promise<Result<Verification, RunVerificationError>>

export type RunVerificationDeps = {
  readonly verifications: VerificationRepository
  readonly checkChallenge: CheckChallenge
  readonly publish: Publish<VerificationEvent>
  readonly generateId: GenerateId
  readonly clock: Clock
}

export function runVerification(deps: RunVerificationDeps): RunVerification {
  return async ({ verificationId, trigger }) => {
    const found = await deps.verifications.findById(verificationId)
    if (found === null) return err({ type: "not_found" })
    if (found.status !== "running") return err({ type: "not_running" })

    const startedAt = deps.clock()
    if (isPastDeadline(found, startedAt)) return ok(await giveUp(deps, found, startedAt))

    const outcome = await deps.checkChallenge(found.method, found.challenge)
    const at = deps.clock()
    const moved = recordAttempt(found, outcome, at)

    await deps.verifications.saveRun(moved, {
      id: deps.generateId("att"),
      verificationId,
      trigger,
      outcome,
      latencyMs: at.getTime() - startedAt.getTime(),
      at,
    })

    const subject = { verificationId, subjectId: found.subjectId, ownerId: found.ownerId, at }

    if (outcome.type === "found") {
      await deps.publish({ name: "verification/attempt.succeeded", data: subject })
    }
    if (outcome.type === "absent") {
      await deps.publish({
        name: "verification/attempt.failed",
        data: {
          ...subject,
          diagnosis: outcome.diagnosis,
          since: found.lastRun?.at ?? found.createdAt,
        },
      })
    }
    if (moved.status === "exhausted") {
      await deps.publish({ name: "verification/exhausted", data: subject })
    }

    return ok(moved)
  }
}

async function giveUp(
  deps: RunVerificationDeps,
  verification: Verification,
  at: Date,
): Promise<Verification> {
  const exhausted = exhaust(verification)
  await deps.verifications.save(exhausted)
  await deps.publish({
    name: "verification/exhausted",
    data: {
      verificationId: verification.id,
      subjectId: verification.subjectId,
      ownerId: verification.ownerId,
      at,
    },
  })

  return exhausted
}
