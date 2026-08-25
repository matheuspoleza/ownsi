import { err, ok, type Result } from "../../shared/result.ts"
import type { Domain } from "../domain/domain.ts"
import type { DomainRepository } from "../domain/ports.ts"

export type DomainNotFound = { readonly type: "not_found" }

export type GetDomainInput = {
  readonly userId: string
  readonly domainId: string
}

export type GetDomain = (input: GetDomainInput) => Promise<Result<Domain, DomainNotFound>>

export function getDomain(domains: DomainRepository): GetDomain {
  return async ({ userId, domainId }) => {
    const found = await domains.findById(domainId)

    return found === null || found.userId !== userId ? err({ type: "not_found" }) : ok(found)
  }
}
