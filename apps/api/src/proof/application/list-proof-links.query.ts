import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { FindProvedClaim, ProofLinkRepository } from "../domain/ports.ts"
import { type ProofLinkView, viewOf } from "../domain/proof-link.ts"

export type ProofLinksUnavailable = { readonly type: "claim_not_proved" }

export type ListProofLinksInput = {
  readonly userId: string
  readonly email: string
  readonly claimId: string
}

export type ListProofLinks = (
  input: ListProofLinksInput,
) => Promise<Result<readonly ProofLinkView[], ProofLinksUnavailable>>

export type ListProofLinksDeps = {
  readonly links: ProofLinkRepository
  readonly findProvedClaim: FindProvedClaim
  readonly clock: Clock
}

export function listProofLinks(deps: ListProofLinksDeps): ListProofLinks {
  return async (input) => {
    const proved = await deps.findProvedClaim(input)
    if (proved === null) return err({ type: "claim_not_proved" })

    const now = deps.clock()
    const links = await deps.links.listByClaim(proved.claimId)

    return ok(links.map((link) => viewOf(link, now)))
  }
}
