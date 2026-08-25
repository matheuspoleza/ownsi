import { err, ok, type Result } from "../../shared/result.ts"
import type { DomainRepository } from "../domain/ports.ts"
import type { DomainNotFound } from "./get-domain.query.ts"

export type DeleteDomainInput = {
  readonly userId: string
  readonly domainId: string
}

export type DeleteDomain = (input: DeleteDomainInput) => Promise<Result<void, DomainNotFound>>

export function deleteDomain(domains: DomainRepository): DeleteDomain {
  return async ({ userId, domainId }) => {
    const found = await domains.findById(domainId)
    if (found === null || found.userId !== userId) return err({ type: "not_found" })

    await domains.remove(domainId)

    return ok(undefined)
  }
}
