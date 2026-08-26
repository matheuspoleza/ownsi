import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { FindProvedClaim, ProofLinkRepository } from "../domain/ports.ts"
import { type ProofLinkView, revoked, viewOf } from "../domain/proof-link.ts"

export type RevokeProofLinkError = { readonly type: "not_found" }

export type RevokeProofLinkInput = {
  readonly userId: string
  readonly email: string
  readonly claimId: string
  readonly slug: string
}

export type RevokeProofLink = (
  input: RevokeProofLinkInput,
) => Promise<Result<ProofLinkView, RevokeProofLinkError>>

export type RevokeProofLinkDeps = {
  readonly links: ProofLinkRepository
  readonly findProvedClaim: FindProvedClaim
  readonly clock: Clock
}

export function revokeProofLink(deps: RevokeProofLinkDeps): RevokeProofLink {
  return async (input) => {
    const proved = await deps.findProvedClaim(input)
    if (proved === null) return err({ type: "not_found" })

    const link = await deps.links.findBySlug(input.slug)
    if (link === null || link.claimId !== proved.claimId) return err({ type: "not_found" })

    const taken = revoked(link, deps.clock())
    await deps.links.save(taken)

    return ok(viewOf(taken))
  }
}
