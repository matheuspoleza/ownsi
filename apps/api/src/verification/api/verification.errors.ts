import { errorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { RunVerificationError } from "../application/run-verification.use-case.ts"

export const notFound = {
  status: 404 as const,
  body: errorResponse("verification_not_found", "No verification on this account has that id."),
}

export type RunFailure = {
  readonly status: 404 | 409
  readonly body: ReturnType<typeof errorResponse>
}

export function toRunError(error: RunVerificationError): RunFailure {
  switch (error.type) {
    case "not_found":
      return notFound
    case "not_running":
      return {
        status: 409,
        body: errorResponse(
          "verification_not_running",
          "This verification has finished. Claim the domain again to start a new one.",
        ),
      }
    default:
      return unreachable(error)
  }
}
