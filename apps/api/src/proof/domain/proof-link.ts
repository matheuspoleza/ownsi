import { daysAfter } from "../../shared/time.ts"
import type { Attestation } from "./attestation.ts"

export const PROOF_LINK_DAYS = 7

export type ProofLink = {
  readonly slug: string
  readonly claimId: string
  readonly attestation: Attestation
  readonly issuedAt: Date
  readonly expiresAt: Date
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
  | { readonly type: "live"; readonly expiresAt: Date }
  | { readonly type: "expired"; readonly expiredAt: Date }
  | { readonly type: "revoked"; readonly revokedAt: Date }

export function issueProofLink(params: NewProofLink): ProofLink {
  return {
    slug: params.slug,
    claimId: params.claimId,
    attestation: params.attestation,
    issuedAt: params.issuedAt,
    expiresAt: daysAfter(params.issuedAt, PROOF_LINK_DAYS),
    revokedAt: null,
  }
}

export function revoked(link: ProofLink, at: Date): ProofLink {
  return { ...link, revokedAt: link.revokedAt ?? at }
}

export function standingOf(link: ProofLink, now: Date): LinkStanding {
  if (link.revokedAt !== null) return { type: "revoked", revokedAt: link.revokedAt }
  if (link.expiresAt.getTime() <= now.getTime()) {
    return { type: "expired", expiredAt: link.expiresAt }
  }

  return { type: "live", expiresAt: link.expiresAt }
}

export function isLive(link: ProofLink, now: Date): boolean {
  return standingOf(link, now).type === "live"
}

export function viewOf(link: ProofLink, now: Date): ProofLinkView {
  return { link, standing: standingOf(link, now) }
}
