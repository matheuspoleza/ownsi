import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { FindProvedClaim, GenerateSlug, ProofLinkRepository } from "../domain/ports.ts"
import { isLive, issueProofLink, type ProofLinkView, viewOf } from "../domain/proof-link.ts"

export type ProofLinkUnavailable = { readonly type: "claim_not_proved" }

export type FindOrCreateProofLinkInput = {
  readonly userId: string
  readonly email: string
  readonly claimId: string
}

export type FindOrCreateProofLink = (
  input: FindOrCreateProofLinkInput,
) => Promise<Result<ProofLinkView, ProofLinkUnavailable>>

export type FindOrCreateProofLinkDeps = {
  readonly links: ProofLinkRepository
  readonly findProvedClaim: FindProvedClaim
  readonly generateSlug: GenerateSlug
  readonly clock: Clock
}

export function findOrCreateProofLink(deps: FindOrCreateProofLinkDeps): FindOrCreateProofLink {
  return async (input) => {
    const proved = await deps.findProvedClaim(input)
    if (proved === null) return err({ type: "claim_not_proved" })

    const now = deps.clock()
    const existing = await deps.links.listByClaim(proved.claimId)
    const live = existing.find((link) => isLive(link, now))
    if (live) return ok(viewOf(live, now))

    const issued = issueProofLink({
      slug: deps.generateSlug(),
      claimId: proved.claimId,
      attestation: proved.attestation,
      issuedAt: now,
    })

    await deps.links.save(issued)

    return ok(viewOf(issued, now))
  }
}
