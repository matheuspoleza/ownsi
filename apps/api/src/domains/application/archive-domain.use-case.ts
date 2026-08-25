import type { Publish } from "../../shared/bus.ts"
import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import { archive, type Domain } from "../domain/domain.ts"
import type { DomainRepository } from "../domain/ports.ts"
import type { DomainEvent } from "../domains.contract.ts"
import type { DomainNotFound } from "./get-domain.query.ts"

export type ArchiveDomainInput = {
  readonly userId: string
  readonly domainId: string
}

export type ArchiveDomain = (input: ArchiveDomainInput) => Promise<Result<Domain, DomainNotFound>>

export type ArchiveDomainDeps = {
  readonly domains: DomainRepository
  readonly publish: Publish<DomainEvent>
  readonly clock: Clock
}

export function archiveDomain(deps: ArchiveDomainDeps): ArchiveDomain {
  return async ({ userId, domainId }) => {
    const found = await deps.domains.findById(domainId)
    if (found === null || found.userId !== userId) return err({ type: "not_found" })

    const archived = archive(found, deps.clock())
    await deps.domains.save(archived)
    await deps.publish({ name: "domains/domain.archived", data: { userId, domainId } })

    return ok(archived)
  }
}
