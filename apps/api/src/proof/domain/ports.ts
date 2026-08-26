import type { Attestation } from "./attestation.ts"
import type { ProofLink } from "./proof-link.ts"

export type ProofLinkRepository = {
  readonly findBySlug: (slug: string) => Promise<ProofLink | null>
  readonly listByClaim: (claimId: string) => Promise<readonly ProofLink[]>
  readonly save: (link: ProofLink) => Promise<void>
}

export type ProvedClaim = {
  readonly claimId: string
  readonly attestation: Attestation
}

/**
 * The claim a link is minted from, or null when it is not this account's or was never
 * proved. A link is only ever a share of something already true.
 */
export type FindProvedClaim = (input: {
  readonly userId: string
  readonly email: string
  readonly claimId: string
}) => Promise<ProvedClaim | null>

export type GenerateSlug = () => string
