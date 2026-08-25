import type { InngestClient } from "../../shared/inngest.ts"
import type { ScheduleVerification, StopSchedule } from "../domain/ports.ts"

export const VERIFICATION_CREATED = "verification/created"

export const VERIFICATION_STOPPED = "verification/stopped"

export type VerificationCreated = {
  readonly verificationId: string
  readonly runAt: string
}

export function inngestScheduleVerification(client: InngestClient): ScheduleVerification {
  return async ({ verificationId, runAt }) => {
    await client.send({
      name: VERIFICATION_CREATED,
      data: { verificationId, runAt: runAt.toISOString() },
    })
  }
}

export function inngestStopSchedule(client: InngestClient): StopSchedule {
  return async ({ verificationId }) => {
    await client.send({ name: VERIFICATION_STOPPED, data: { verificationId } })
  }
}

export const manualScheduling: ScheduleVerification = async () => {}

export const manualStopSchedule: StopSchedule = async () => {}
