import type { Clock } from "../../shared/clock.ts"
import type { ProofLinkRepository } from "../domain/ports.ts"
import { isLive, revoked } from "../domain/proof-link.ts"

export type RevokeProofLinksInput = {
  readonly claimId: string
}

export type RevokeProofLinks = (input: RevokeProofLinksInput) => Promise<void>

export type RevokeProofLinksDeps = {
  readonly links: ProofLinkRepository
  readonly clock: Clock
}

export function revokeProofLinks(deps: RevokeProofLinksDeps): RevokeProofLinks {
  return async ({ claimId }) => {
    const at = deps.clock()

    for (const link of await deps.links.listByClaim(claimId)) {
      if (isLive(link)) await deps.links.save(revoked(link, at))
    }
  }
}
