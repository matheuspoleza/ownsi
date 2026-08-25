import { errorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { CancelClaimError } from "../application/cancel-claim.use-case.ts"
import type { CreateClaimError } from "../application/create-claim.use-case.ts"

export const notFound = {
  status: 404 as const,
  body: errorResponse("claim_not_found", "No claim on your account has that id."),
}

export const claimEnded = {
  status: 409 as const,
  body: errorResponse(
    "claim_ended",
    "That claim has ended, and an ended claim takes no action. Claim the domain again to start a new one.",
  ),
}

export type ClaimFailure = {
  readonly status: 404 | 409
  readonly body: ReturnType<typeof errorResponse>
}

export function toCreateClaimError(error: CreateClaimError): ClaimFailure {
  switch (error.type) {
    case "domain_not_found":
      return {
        status: 404,
        body: errorResponse("domain_not_found", "That domain is not on your list."),
      }
    case "already_claimed":
      return {
        status: 409,
        body: errorResponse(
          "already_claimed",
          "That domain already has a claim open on your account, with the token it was issued.",
        ),
      }
    default:
      return unreachable(error)
  }
}

export function toCancelClaimError(error: CancelClaimError): ClaimFailure {
  switch (error.type) {
    case "not_found":
      return notFound
    case "claim_ended":
      return claimEnded
    default:
      return unreachable(error)
  }
}
