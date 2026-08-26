import { errorResponse } from "../../shared/http/error-response.ts"

export const claimNotProved = {
  status: 404 as const,
  body: errorResponse(
    "claim_not_proved",
    "No proved claim on your account has that id. A link shares a proof, so there is nothing to share until one is granted.",
  ),
}

export const proofLinkNotFound = {
  status: 404 as const,
  body: errorResponse("proof_link_not_found", "No link on that claim has that slug."),
}
