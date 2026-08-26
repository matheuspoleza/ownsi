import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type {
  FindProvedClaim,
  GenerateSlug,
  ProofLinkRepository,
  ReadProvider,
} from "../domain/ports.ts"
import { isLive, issueProofLink, type ProofLinkView, viewOf } from "../domain/proof-link.ts"

export type ProofLinkUnavailable =
  | { readonly type: "claim_not_proved" }
  | { readonly type: "domain_archived" }

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
  readonly readProvider: ReadProvider
  readonly generateSlug: GenerateSlug
  readonly clock: Clock
}

export function findOrCreateProofLink(deps: FindOrCreateProofLinkDeps): FindOrCreateProofLink {
  return async (input) => {
    const proved = await deps.findProvedClaim(input)
    if (proved === null) return err({ type: "claim_not_proved" })
    if (proved.archived) return err({ type: "domain_archived" })

    const now = deps.clock()
    const existing = await deps.links.listByClaim(proved.claimId)
    const live = existing.find(isLive)
    if (live) return ok(viewOf(live))

    const issued = issueProofLink({
      slug: deps.generateSlug(),
      claimId: proved.claimId,
      attestation: {
        domain: proved.domain,
        unicodeDomain: proved.unicodeDomain,
        heldBy: proved.heldBy,
        token: proved.token,
        challengeHost: proved.challengeHost,
        provider: await deps.readProvider(proved.domain),
        provedAt: proved.provedAt,
      },
      issuedAt: now,
    })

    await deps.links.save(issued)

    return ok(viewOf(issued))
  }
}
