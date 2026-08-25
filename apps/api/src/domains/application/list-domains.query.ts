import type { Domain } from "../domain/domain.ts"
import type { DomainRepository } from "../domain/ports.ts"

export type ListDomainsInput = {
  readonly userId: string
}

export type ListDomains = (input: ListDomainsInput) => Promise<readonly Domain[]>

export function listDomains(domains: DomainRepository): ListDomains {
  return ({ userId }) => domains.listByUser(userId)
}
