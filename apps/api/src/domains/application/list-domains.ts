import type { AccountDomainRepository } from "../domain/ports.ts"
import type { DomainView, ViewDomain } from "./domain-view.ts"

export type ListDomainsInput = {
  readonly userId: string
}

export type ListDomains = (input: ListDomainsInput) => Promise<readonly DomainView[]>

export type ListDomainsDeps = {
  readonly domains: AccountDomainRepository
  readonly view: ViewDomain
}

export function createListDomains(deps: ListDomainsDeps): ListDomains {
  return async ({ userId }) => {
    const records = await deps.domains.listByUser(userId)
    return Promise.all(records.filter((record) => record.archivedAt === null).map(deps.view))
  }
}
