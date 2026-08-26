import { type Static, t } from "elysia"
import { unreachable } from "../../shared/result.ts"
import type { PublishedProof } from "../application/get-proof.query.ts"
import type { Recency } from "../domain/recency.ts"
import { proofUrl } from "./proof-link.response.ts"

const RecencyResponse = t.Union([
  t.Object({ type: t.Literal("latest") }),
  t.Object({ type: t.Literal("earlier"), latestProvedAt: t.String() }),
])

export const ProofResponse = t.Object({
  slug: t.String(),
  url: t.String(),
  domain: t.String(),
  unicodeDomain: t.String(),
  heldBy: t.String(),
  token: t.String(),
  challengeHost: t.String(),
  provider: t.Union([t.String(), t.Null()]),
  provedAt: t.String(),
  recency: RecencyResponse,
})

export function toProofResponse(
  { link, recency }: PublishedProof,
  appUrl: string,
): Static<typeof ProofResponse> {
  return {
    slug: link.slug,
    url: proofUrl(appUrl, link.slug),
    domain: link.attestation.domain,
    unicodeDomain: link.attestation.unicodeDomain,
    heldBy: link.attestation.heldBy,
    token: link.attestation.token,
    challengeHost: link.attestation.challengeHost,
    provider: link.attestation.provider,
    provedAt: link.attestation.provedAt.toISOString(),
    recency: toRecencyResponse(recency),
  }
}

function toRecencyResponse(recency: Recency): Static<typeof RecencyResponse> {
  switch (recency.type) {
    case "latest":
      return { type: "latest" }
    case "earlier":
      return { type: "earlier", latestProvedAt: recency.latestProvedAt.toISOString() }
    default:
      return unreachable(recency)
  }
}
