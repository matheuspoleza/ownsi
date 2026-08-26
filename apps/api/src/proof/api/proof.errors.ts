import { errorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { ProofLinkUnavailable } from "../application/find-or-create-proof-link.use-case.ts"
import type { ProofUnreadable } from "../application/get-proof.query.ts"

export const claimNotProved = {
  status: 404 as const,
  body: errorResponse(
    "claim_not_proved",
    "No proved claim on your account has that id. A link shares a proof, so there is nothing to share until one is granted.",
  ),
}

export const domainArchived = {
  status: 409 as const,
  body: errorResponse(
    "domain_archived",
    "That domain is archived, and archiving took its links back. Put it on your list again to publish a new one.",
  ),
}

export function toProofLinkError(reason: ProofLinkUnavailable) {
  switch (reason.type) {
    case "claim_not_proved":
      return claimNotProved
    case "domain_archived":
      return domainArchived
    default:
      return unreachable(reason)
  }
}

export const proofLinkNotFound = {
  status: 404 as const,
  body: errorResponse("proof_link_not_found", "No link on that claim has that slug."),
}

export type ProofErrorStatus = 404 | 410

export function toProofError(reason: ProofUnreadable): {
  status: ProofErrorStatus
  body: ReturnType<typeof errorResponse>
} {
  switch (reason.type) {
    case "not_found":
      return {
        status: 404,
        body: errorResponse("proof_not_found", "No proof resolves at that slug."),
      }
    case "revoked":
      return {
        status: 410,
        body: errorResponse(
          "proof_revoked",
          "That link was taken back. The proof behind it stands, and whoever holds it can publish another.",
        ),
      }
    default:
      return unreachable(reason)
  }
}
