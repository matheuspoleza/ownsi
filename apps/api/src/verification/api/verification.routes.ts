import { Elysia, t } from "elysia"
import type { Clock } from "../../shared/clock.ts"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { SessionPlugin } from "../../shared/http/session.ts"
import type { GetVerification } from "../application/get-verification.query.ts"
import type { ListAttempts } from "../application/list-attempts.query.ts"
import type { RunVerification } from "../application/run-verification.use-case.ts"
import { notFound, toRunError } from "./verification.errors.ts"
import {
  AttemptListResponse,
  toAttemptListResponse,
  toVerificationResponse,
  VerificationResponse,
} from "./verification.response.ts"

export type VerificationHandlers = {
  readonly getVerification: GetVerification
  readonly listAttempts: ListAttempts
  readonly runVerification: RunVerification
  readonly clock: Clock
}

const Identifier = t.Object({ id: t.String({ minLength: 1 }) })

export function verificationRoutes(handlers: VerificationHandlers, session: SessionPlugin) {
  return new Elysia({ name: "verification.routes", prefix: "/verifications" })
    .use(session)
    .get(
      "/:id",
      async ({ params, user, status }) => {
        const found = await handlers.getVerification({ userId: user.id, verificationId: params.id })
        if (!found.ok) return status(notFound.status, notFound.body)

        return toVerificationResponse(found.value, handlers.clock())
      },
      {
        params: Identifier,
        session: true,
        response: { 200: VerificationResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Verifications"],
          summary: "Read one verification",
          description:
            "Where the process is: the named diagnosis of the last run, when the next one " +
            "lands, and the deadline it is running against.",
        },
      },
    )
    .get(
      "/:id/attempts",
      async ({ params, user, status }) => {
        const found = await handlers.getVerification({ userId: user.id, verificationId: params.id })
        if (!found.ok) return status(notFound.status, notFound.body)

        const attempts = await handlers.listAttempts({ userId: user.id, verificationId: params.id })
        if (!attempts.ok) return status(notFound.status, notFound.body)

        return toAttemptListResponse(attempts.value, found.value.challenge)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: AttemptListResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Verifications"],
          summary: "List the attempts behind a verification",
          description:
            "Every read this verification has made, newest first — the evidence a proof " +
            "rests on, and the record of the failures that came before it.",
        },
      },
    )
    .post(
      "/:id/runs",
      async ({ params, user, status }) => {
        const found = await handlers.getVerification({ userId: user.id, verificationId: params.id })
        if (!found.ok) return status(notFound.status, notFound.body)

        const ran = await handlers.runVerification({
          verificationId: params.id,
          trigger: "requested",
        })
        if (!ran.ok) {
          const failure = toRunError(ran.error)
          return status(failure.status, failure.body)
        }

        return toVerificationResponse(ran.value, handlers.clock())
      },
      {
        params: Identifier,
        session: true,
        response: {
          200: VerificationResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
        detail: {
          tags: ["Verifications"],
          summary: "Run a check now",
          description:
            "Reads DNS now instead of waiting for the next scheduled run, and answers with " +
            "what the read found: the proof, or the named reason the record is not there.",
        },
      },
    )
}
