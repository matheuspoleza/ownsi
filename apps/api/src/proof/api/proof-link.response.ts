import { type Static, t } from "elysia"
import type { ProofLinkView } from "../domain/proof-link.ts"

export const ProofLinkResponse = t.Object({
  slug: t.String(),
  url: t.String(),
  claimId: t.String(),
  domain: t.String(),
  unicodeDomain: t.String(),
  heldBy: t.String(),
  token: t.String(),
  provedAt: t.String(),
  standing: t.UnionEnum(["live", "expired", "revoked"]),
  issuedAt: t.String(),
  expiresAt: t.String(),
  revokedAt: t.Union([t.String(), t.Null()]),
})

export const ProofLinkListResponse = t.Object({ links: t.Array(ProofLinkResponse) })

export function proofUrl(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, "")}/p/${slug}`
}

export function toProofLinkResponse(
  { link, standing }: ProofLinkView,
  appUrl: string,
): Static<typeof ProofLinkResponse> {
  return {
    slug: link.slug,
    url: proofUrl(appUrl, link.slug),
    claimId: link.claimId,
    domain: link.attestation.domain,
    unicodeDomain: link.attestation.unicodeDomain,
    heldBy: link.attestation.heldBy,
    token: link.attestation.token,
    provedAt: link.attestation.provedAt.toISOString(),
    standing: standing.type,
    issuedAt: link.issuedAt.toISOString(),
    expiresAt: link.expiresAt.toISOString(),
    revokedAt: link.revokedAt === null ? null : link.revokedAt.toISOString(),
  }
}

export function toProofLinkListResponse(
  views: readonly ProofLinkView[],
  appUrl: string,
): Static<typeof ProofLinkListResponse> {
  return { links: views.map((view) => toProofLinkResponse(view, appUrl)) }
}
