import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { ClaimDetail } from "../claims.contract.ts"
import { type Claim, openClaim, verifiedBy } from "../domain/claim.ts"
import { coexistenceFor } from "../domain/coexistence.ts"
import type {
  ClaimRepository,
  FindCoexistence,
  FindDomain,
  GenerateId,
  GenerateToken,
  SendNotice,
  StartVerifying,
} from "../domain/ports.ts"

export type CreateClaimInput = {
  readonly userId: string
  readonly domainId: string
}

export type CreateClaimError =
  | { readonly type: "domain_not_found" }
  | { readonly type: "domain_archived" }
  | { readonly type: "already_claimed"; readonly claim: Claim }

export type CreateClaim = (
  input: CreateClaimInput,
) => Promise<Result<ClaimDetail, CreateClaimError>>

export type CreateClaimDeps = {
  readonly claims: ClaimRepository
  readonly findDomain: FindDomain
  readonly findCoexistence: FindCoexistence
  readonly startVerifying: StartVerifying
  readonly sendNotice: SendNotice
  readonly generateId: GenerateId
  readonly generateToken: GenerateToken
  readonly clock: Clock
}

export function createClaim(deps: CreateClaimDeps): CreateClaim {
  return async ({ userId, domainId }) => {
    const domain = await deps.findDomain({ userId, domainId })
    if (domain === null) return err({ type: "domain_not_found" })
    if (domain.archived) return err({ type: "domain_archived" })

    const open = await deps.claims.findOpenByDomain(domainId)
    if (open !== null) return err({ type: "already_claimed", claim: open })

    const retired = await deps.claims.listByDomain(domainId)
    const claim = openClaim({
      id: deps.generateId("clm"),
      userId,
      domainId,
      token: deps.generateToken(),
      openedAt: deps.clock(),
    })
    await deps.claims.save(claim)

    const verificationId = await deps.startVerifying({
      subjectId: claim.id,
      ownerId: userId,
      method: "dns_txt",
      challenge: {
        domain: domain.nameAscii,
        token: claim.token,
        previousTokens: retired.map((past) => past.token),
      },
      deadline: claim.expiresAt,
    })

    const opened = verificationId === null ? claim : verifiedBy(claim, verificationId)
    if (verificationId !== null) await deps.claims.save(opened)

    await deps.sendNotice({
      notice: { kind: "opened" },
      claimId: opened.id,
      userId,
      domainId,
      domain: domain.nameAscii,
      token: opened.token,
    })

    const other = await deps.findCoexistence(domain.nameAscii, userId)

    return ok({ claim: opened, domain, coexistence: coexistenceFor(other, opened) })
  }
}
