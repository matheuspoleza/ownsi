import { errorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { FindOrCreateDomainError } from "../application/find-or-create-domain.use-case.ts"

export const notFound = {
  status: 404 as const,
  body: errorResponse("domain_not_found", "That domain is not on your list."),
}

const INVALID_DOMAIN_MESSAGES = {
  empty: "Type a domain name to claim it.",
  not_a_hostname: "That is not a domain name we can prove.",
  too_long: "That name is longer than a domain name can be.",
} as const

export type DomainFailure = {
  readonly status: 400
  readonly body: ReturnType<typeof errorResponse>
}

export function toFindOrCreateDomainError(error: FindOrCreateDomainError): DomainFailure {
  switch (error.type) {
    case "invalid_domain":
      return {
        status: 400,
        body: errorResponse("invalid_domain", INVALID_DOMAIN_MESSAGES[error.reason]),
      }
    default:
      return unreachable(error.type)
  }
}
