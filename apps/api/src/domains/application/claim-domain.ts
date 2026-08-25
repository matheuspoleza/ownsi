import type { Clock } from "../../shared/clock.ts"
import { type DomainNameError, parseDomainName } from "../../shared/domain-name.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import { type AccountDomain, pendingClaim, reclaim } from "../domain/account-domain.ts"
import { openClaim } from "../domain/claim.ts"
import { nameDomain } from "../domain/domain.ts"
import type {
  AccountDomainRepository,
  GenerateId,
  GenerateToken,
  ScheduleClaim,
  StartDomain,
} from "../domain/ports.ts"
import type { DomainView, ViewDomain } from "./domain-view.ts"

export type ClaimDomainError =
  | { readonly type: "invalid_domain"; readonly reason: DomainNameError }
  | { readonly type: "already_claimed"; readonly record: AccountDomain }

export type ClaimDomainInput = {
  readonly userId: string
  readonly domain: string
}

export type ClaimDomain = (input: ClaimDomainInput) => Promise<Result<DomainView, ClaimDomainError>>

export type ClaimDomainDeps = {
  readonly domains: AccountDomainRepository
  readonly generateId: GenerateId
  readonly generateToken: GenerateToken
  readonly startDomain: StartDomain
  readonly scheduleClaim: ScheduleClaim
  readonly view: ViewDomain
  readonly clock: Clock
}

export function createClaimDomain(deps: ClaimDomainDeps): ClaimDomain {
  return async ({ userId, domain }) => {
    const parsed = parseDomainName(domain)
    if (!parsed.ok) return err({ type: "invalid_domain", reason: parsed.error })

    const now = deps.clock()
    const existing = await deps.domains.findByName(userId, parsed.value.ascii)

    if (existing?.claim.state === "pending") {
      return err({ type: "already_claimed", record: existing })
    }

    const record = existing
      ? reclaim(
          existing,
          openClaim({
            id: deps.generateId("clm"),
            userId,
            domainId: existing.domain.id,
            token: deps.generateToken(),
            openedAt: now,
          }),
        )
      : deps.startDomain({
          userId,
          domain: nameDomain({ id: deps.generateId("dom"), name: parsed.value, createdAt: now }),
          claimId: deps.generateId("clm"),
          token: deps.generateToken(),
          now,
        })

    await deps.domains.save(record)

    const open = pendingClaim(record)
    if (open) {
      await deps.scheduleClaim({
        userId,
        domainId: record.domain.id,
        claimId: open.id,
        checkAt: open.nextCheckAt,
      })
    }

    return ok(await deps.view(record))
  }
}
