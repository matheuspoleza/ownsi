import { errorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { ClaimActionError } from "../application/claim-action.ts"
import type { ClaimDomainError } from "../application/claim-domain.ts"

export const notFound = {
  status: 404 as const,
  body: errorResponse("domain_not_found", "That domain is not on your list."),
}

export type DomainFailure = {
  readonly status: 400 | 409
  readonly body: ReturnType<typeof errorResponse>
}

export function toClaimDomainError(error: ClaimDomainError): DomainFailure {
  switch (error.type) {
    case "invalid_domain":
      return {
        status: 400,
        body: errorResponse("invalid_domain", INVALID_DOMAIN_MESSAGES[error.reason]),
      }
    case "already_claimed":
      return {
        status: 409,
        body: errorResponse(
          "already_claimed",
          `${error.record.domain.nameAscii} already has a claim open on your account, with the token it was issued.`,
        ),
      }
    default:
      return unreachable(error)
  }
}

export type ClaimActionFailure = {
  readonly status: 404 | 409
  readonly body: ReturnType<typeof errorResponse>
}

export function toClaimActionError(error: ClaimActionError): ClaimActionFailure {
  switch (error.type) {
    case "not_found":
      return notFound
    case "claim_ended":
      return {
        status: 409,
        body: errorResponse(
          "claim_ended",
          "That claim has ended, and an ended claim takes no action. Claim the domain again to start a new one.",
        ),
      }
    default:
      return unreachable(error)
  }
}

const INVALID_DOMAIN_MESSAGES = {
  empty: "Type a domain name to claim it.",
  not_a_hostname: "That is not a domain name we can prove.",
  too_long: "That name is longer than a domain name can be.",
} as const
