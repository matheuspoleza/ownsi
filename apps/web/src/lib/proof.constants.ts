import { type ProofPublication, proofPublication } from "./proof.utils.ts"
import type { ProviderId } from "./providers.constants.ts"

export interface ExampleProof {
  domain: string
  provedAt: string
  provider: ProviderId
  token: string
  value: string
}

/** The proof the marketing screens show. It belongs to ownsi, not to whoever is reading. */
export const EXAMPLE_PROOF: ExampleProof = {
  domain: "ownsi.dev",
  provedAt: "2026-08-25T14:02:00.000Z",
  provider: "cloudflare",
  token: "ownsi_v1_a8f8d423cc",
  value: "ownsi_verify_0a4c7t2n1",
}

/** The publication beside it, so the marketing ticket prints an address and not a blank. */
export const EXAMPLE_PUBLICATION: ProofPublication = proofPublication(
  "https://ownsi.dev/p/8f2k91mx4c",
)
