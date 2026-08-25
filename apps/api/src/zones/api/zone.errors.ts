import { errorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { GetZoneError } from "../application/get-zone.query.ts"

export type ZoneErrorStatus = 400 | 404 | 502

export function toZoneError(error: GetZoneError): {
  status: ZoneErrorStatus
  body: ReturnType<typeof errorResponse>
} {
  switch (error.type) {
    case "invalid_domain":
      return {
        status: 400,
        body: errorResponse("invalid_domain", INVALID_DOMAIN_MESSAGES[error.reason]),
      }
    case "no_delegation":
      return {
        status: 404,
        body: errorResponse("no_delegation", `No nameservers are delegated for ${error.name}.`),
      }
    case "unresolvable":
      return {
        status: 502,
        body: errorResponse(
          "unresolvable",
          "We could not reach DNS to read this zone. This one is on us.",
        ),
      }
    default:
      return unreachable(error)
  }
}

const INVALID_DOMAIN_MESSAGES = {
  empty: "Type a domain name to read its zone.",
  not_a_hostname: "That is not a domain name we can read.",
  too_long: "That name is longer than a domain name can be.",
} as const
