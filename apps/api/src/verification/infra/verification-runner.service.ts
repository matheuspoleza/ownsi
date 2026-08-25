import type { InngestClient } from "../../shared/inngest.ts"
import type { VerifyUntilDeadline } from "../application/verify-until-deadline.schedule.ts"
import { type InngestStepApi, inngestStep } from "./inngest-step.service.ts"
import {
  VERIFICATION_CREATED,
  VERIFICATION_STOPPED,
  type VerificationCreated,
} from "./verification-schedule.service.ts"

export function verificationRunner(client: InngestClient, verify: VerifyUntilDeadline) {
  return client.createFunction(
    {
      id: "verify-until-deadline",
      concurrency: { key: "event.data.verificationId", limit: 1 },
      cancelOn: [
        {
          event: VERIFICATION_STOPPED,
          if: "event.data.verificationId == async.data.verificationId",
        },
      ],
    },
    { event: VERIFICATION_CREATED },
    async ({ event, step }) => {
      const created = event.data as VerificationCreated

      await verify(
        { verificationId: created.verificationId },
        inngestStep(step as unknown as InngestStepApi),
      )

      return { verificationId: created.verificationId, ran: "until the deadline" }
    },
  )
}
