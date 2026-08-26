import type { Attestation } from "./attestation.ts"

export type ProofLink = {
  readonly slug: string
  readonly claimId: string
  readonly attestation: Attestation
  readonly issuedAt: Date
  readonly revokedAt: Date | null
}

export type NewProofLink = {
  readonly slug: string
  readonly claimId: string
  readonly attestation: Attestation
  readonly issuedAt: Date
}

export type ProofLinkView = {
  readonly link: ProofLink
  readonly standing: LinkStanding
}

export type LinkStanding =
  | { readonly type: "live" }
  | { readonly type: "revoked"; readonly revokedAt: Date }

export function issueProofLink(params: NewProofLink): ProofLink {
  return {
    slug: params.slug,
    claimId: params.claimId,
    attestation: params.attestation,
    issuedAt: params.issuedAt,
    revokedAt: null,
  }
}

export function revoked(link: ProofLink, at: Date): ProofLink {
  return { ...link, revokedAt: link.revokedAt ?? at }
}

export function standingOf(link: ProofLink): LinkStanding {
  if (link.revokedAt !== null) return { type: "revoked", revokedAt: link.revokedAt }

  return { type: "live" }
}

export function isLive(link: ProofLink): boolean {
  return standingOf(link).type === "live"
}

export function viewOf(link: ProofLink): ProofLinkView {
  return { link, standing: standingOf(link) }
}
