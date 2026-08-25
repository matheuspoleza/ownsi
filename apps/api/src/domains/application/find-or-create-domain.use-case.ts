import type { Clock } from "../../shared/clock.ts"
import { type DomainNameError, parseDomainName } from "../../shared/domain-name.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import { type Domain, nameDomain } from "../domain/domain.ts"
import type { DomainRepository, GenerateId } from "../domain/ports.ts"

export type FindOrCreateDomainInput = {
  readonly userId: string
  readonly domain: string
}

export type FindOrCreateDomainError = {
  readonly type: "invalid_domain"
  readonly reason: DomainNameError
}

export type FindOrCreateDomain = (
  input: FindOrCreateDomainInput,
) => Promise<Result<Domain, FindOrCreateDomainError>>

export type FindOrCreateDomainDeps = {
  readonly domains: DomainRepository
  readonly generateId: GenerateId
  readonly clock: Clock
}

export function findOrCreateDomain(deps: FindOrCreateDomainDeps): FindOrCreateDomain {
  return async ({ userId, domain }) => {
    const parsed = parseDomainName(domain)
    if (!parsed.ok) return err({ type: "invalid_domain", reason: parsed.error })

    const existing = await deps.domains.findByName(userId, parsed.value.ascii)
    if (existing !== null) return ok(existing)

    const named = nameDomain({
      id: deps.generateId("dom"),
      userId,
      name: parsed.value,
      createdAt: deps.clock(),
    })
    await deps.domains.save(named)

    return ok(named)
  }
}
