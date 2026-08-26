import type { Publish } from "../../shared/bus.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { ClaimEvent } from "../claims.contract.ts"
import { isOpen, prove } from "../domain/claim.ts"
import type {
  ClaimRepository,
  FindDomain,
  FindOtherClaimants,
  SendNotice,
} from "../domain/ports.ts"

export type ProveClaimInput = {
  readonly claimId: string
  readonly at: Date
}

export type ProveClaimError = { readonly type: "not_found" } | { readonly type: "claim_ended" }

export type ProveClaim = (input: ProveClaimInput) => Promise<Result<void, ProveClaimError>>

export type ProveClaimDeps = {
  readonly claims: ClaimRepository
  readonly findDomain: FindDomain
  readonly otherClaimants: FindOtherClaimants
  readonly sendNotice: SendNotice
  readonly publish: Publish<ClaimEvent>
}

export function proveClaim(deps: ProveClaimDeps): ProveClaim {
  return async ({ claimId, at }) => {
    const found = await deps.claims.findById(claimId)
    if (found === null) return err({ type: "not_found" })
    if (!isOpen(found)) return err({ type: "claim_ended" })

    const domain = await deps.findDomain({ userId: found.userId, domainId: found.domainId })
    if (domain === null) return err({ type: "not_found" })

    const proved = prove(found, at)
    await deps.claims.save(proved)

    await deps.publish({
      name: "claims/claim.ended",
      data: {
        claimId: proved.id,
        userId: proved.userId,
        domainId: proved.domainId,
        reason: "proved",
        endedAt: proved.endedAt,
      },
    })

    await deps.sendNotice({
      notice: { kind: "proved", provedAt: at },
      claimId: proved.id,
      userId: proved.userId,
      domainId: proved.domainId,
      domain: domain.nameAscii,
      token: proved.token,
    })

    for (const other of await deps.otherClaimants(domain.nameAscii, proved.userId)) {
      await deps.sendNotice({
        notice: { kind: "coexistence" },
        claimId: other.claimId,
        userId: other.userId,
        domainId: other.domainId,
        domain: domain.nameAscii,
        token: other.token,
      })
    }

    return ok(undefined)
  }
}
