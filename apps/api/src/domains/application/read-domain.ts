import { err, ok, type Result } from "../../shared/result.ts"
import type { AccountDomainRepository } from "../domain/ports.ts"
import type { DomainView, ViewDomain } from "./domain-view.ts"

export type DomainNotFound = { readonly type: "not_found" }

export type ReadDomainInput = {
  readonly userId: string
  readonly id: string
}

export type ReadDomain = (input: ReadDomainInput) => Promise<Result<DomainView, DomainNotFound>>

export type ReadDomainDeps = {
  readonly domains: AccountDomainRepository
  readonly view: ViewDomain
}

export function createReadDomain(deps: ReadDomainDeps): ReadDomain {
  return async ({ userId, id }) => {
    const record = await deps.domains.findById(userId, id)
    return record ? ok(await deps.view(record)) : err({ type: "not_found" })
  }
}
