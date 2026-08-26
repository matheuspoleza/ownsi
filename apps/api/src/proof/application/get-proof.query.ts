import { err, ok, type Result } from "../../shared/result.ts"
import type { FindLatestProof, IsPublished, ProofLinkRepository } from "../domain/ports.ts"
import { isLive, type ProofLink } from "../domain/proof-link.ts"
import { type Recency, recencyOf } from "../domain/recency.ts"

export type ProofUnreadable = { readonly type: "not_found" } | { readonly type: "revoked" }

export type PublishedProof = {
  readonly link: ProofLink
  readonly recency: Recency
}

export type GetProof = (slug: string) => Promise<Result<PublishedProof, ProofUnreadable>>

export type GetProofDeps = {
  readonly links: ProofLinkRepository
  readonly isPublished: IsPublished
  readonly findLatestProof: FindLatestProof
}

export function getProof(deps: GetProofDeps): GetProof {
  return async (slug) => {
    const link = await deps.links.findBySlug(slug)
    if (link === null) return err({ type: "not_found" })
    if (!isLive(link)) return err({ type: "revoked" })
    if (!(await deps.isPublished(link.claimId))) return err({ type: "revoked" })

    const latest = await deps.findLatestProof(link.attestation.domain)

    return ok({ link, recency: recencyOf(link.attestation.provedAt, latest) })
  }
}
