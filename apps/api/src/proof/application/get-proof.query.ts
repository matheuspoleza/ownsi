import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result, unreachable } from "../../shared/result.ts"
import type { ProofLinkRepository } from "../domain/ports.ts"
import { type ProofLink, standingOf } from "../domain/proof-link.ts"

export type ProofUnreadable =
  | { readonly type: "not_found" }
  | { readonly type: "expired" }
  | { readonly type: "revoked" }

export type GetProof = (slug: string) => Promise<Result<ProofLink, ProofUnreadable>>

export type GetProofDeps = {
  readonly links: ProofLinkRepository
  readonly clock: Clock
}

export function getProof(deps: GetProofDeps): GetProof {
  return async (slug) => {
    const link = await deps.links.findBySlug(slug)
    if (link === null) return err({ type: "not_found" })

    const standing = standingOf(link, deps.clock())
    switch (standing.type) {
      case "live":
        return ok(link)
      case "expired":
        return err({ type: "expired" })
      case "revoked":
        return err({ type: "revoked" })
      default:
        return unreachable(standing)
    }
  }
}
