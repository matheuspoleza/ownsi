import type { Clock } from "../../shared/clock.ts"
import { type DomainNameError, parseDomainName } from "../../shared/domain-name.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { Claim } from "../domain/claim.ts"
import type { ClaimRepository, GenerateId, GenerateToken, StartClaim } from "../domain/ports.ts"

export type ClaimDomainError =
  | { readonly type: "invalid_domain"; readonly reason: DomainNameError }
  | { readonly type: "already_claimed"; readonly claim: Claim }

export type ClaimDomainInput = {
  readonly userId: string
  readonly domain: string
}

export type ClaimDomain = (input: ClaimDomainInput) => Promise<Result<Claim, ClaimDomainError>>

export type ClaimDomainDeps = {
  readonly claims: ClaimRepository
  readonly generateId: GenerateId
  readonly generateToken: GenerateToken
  readonly startClaim: StartClaim
  readonly clock: Clock
}

export function createClaimDomain(deps: ClaimDomainDeps): ClaimDomain {
  return async ({ userId, domain }) => {
    const parsed = parseDomainName(domain)
    if (!parsed.ok) return err({ type: "invalid_domain", reason: parsed.error })

    const name = parsed.value.ascii

    const existing = await deps.claims.findByDomain(userId, name)
    if (existing) return err({ type: "already_claimed", claim: existing })

    const claim = deps.startClaim({
      id: deps.generateId(),
      userId,
      domain: name,
      token: deps.generateToken(),
      createdAt: deps.clock(),
    })

    await deps.claims.save(claim)
    return ok(claim)
  }
}
