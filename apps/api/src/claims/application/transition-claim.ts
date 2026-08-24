import { err, ok, type Result } from "../../shared/result.ts"
import { archive, type Claim, reactivate, resume } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"
import type { ClaimNotFound } from "./read-claim.ts"

export type TransitionClaimInput = {
  readonly userId: string
  readonly id: string
}

export type TransitionClaim = (input: TransitionClaimInput) => Promise<Result<Claim, ClaimNotFound>>

export type TransitionClaimDeps = {
  readonly claims: ClaimRepository
}

export function createArchiveClaim(deps: TransitionClaimDeps): TransitionClaim {
  return transition(deps, archive)
}

export function createRestoreClaim(deps: TransitionClaimDeps): TransitionClaim {
  return transition(deps, reactivate)
}

export function createRequestCheck(deps: TransitionClaimDeps): TransitionClaim {
  return transition(deps, resume)
}

function transition(deps: TransitionClaimDeps, apply: (claim: Claim) => Claim): TransitionClaim {
  return async ({ userId, id }) => {
    const claim = await deps.claims.findById(userId, id)
    if (!claim) return err({ type: "not_found" })

    const moved = apply(claim)
    await deps.claims.save(moved)
    return ok(moved)
  }
}
