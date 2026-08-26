import type { Publish } from "../../shared/bus.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import { type Domain, unarchive } from "../domain/domain.ts"
import type { DomainRepository } from "../domain/ports.ts"
import type { DomainEvent } from "../domains.contract.ts"
import type { DomainNotFound } from "./get-domain.query.ts"

export type UnarchiveDomainInput = {
  readonly userId: string
  readonly domainId: string
}

export type UnarchiveDomain = (
  input: UnarchiveDomainInput,
) => Promise<Result<Domain, DomainNotFound>>

export type UnarchiveDomainDeps = {
  readonly domains: DomainRepository
  readonly publish: Publish<DomainEvent>
}

export function unarchiveDomain(deps: UnarchiveDomainDeps): UnarchiveDomain {
  return async ({ userId, domainId }) => {
    const found = await deps.domains.findById(domainId)
    if (found === null || found.userId !== userId) return err({ type: "not_found" })

    const restored = unarchive(found)
    await deps.domains.save(restored)
    await deps.publish({ name: "domains/domain.unarchived", data: { userId, domainId } })

    return ok(restored)
  }
}
