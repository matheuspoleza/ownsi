import type { Publish } from "../shared/bus.ts"
import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import { randomId } from "../shared/identifiers.ts"
import { type ArchiveDomain, archiveDomain } from "./application/archive-domain.use-case.ts"
import { type DeleteDomain, deleteDomain } from "./application/delete-domain.use-case.ts"
import {
  type FindOrCreateDomain,
  findOrCreateDomain,
} from "./application/find-or-create-domain.use-case.ts"
import { type GetDomain, getDomain } from "./application/get-domain.query.ts"
import { type ListDomainNames, listDomainNames } from "./application/list-domain-names.query.ts"
import { type ListDomains, listDomains } from "./application/list-domains.query.ts"
import type { DomainListing, DomainRepository, GenerateId } from "./domain/ports.ts"
import type { DomainEvent } from "./domains.contract.ts"
import { postgresDomainRepository } from "./infra/domain.repository.ts"
import { postgresDomainListing } from "./infra/domain-listing.repository.ts"

export type DomainsModuleDeps = {
  readonly clock: Clock
  readonly database: Database
  readonly publish: Publish<DomainEvent>
}

export type DomainsModuleOverrides = {
  readonly domains?: DomainRepository
  readonly listing?: DomainListing
  readonly generateId?: GenerateId
}

export type DomainsModule = {
  readonly findOrCreateDomain: FindOrCreateDomain
  readonly archiveDomain: ArchiveDomain
  readonly deleteDomain: DeleteDomain
  readonly getDomain: GetDomain
  readonly listDomains: ListDomains
  readonly listDomainNames: ListDomainNames
}

export function createDomainsModule(
  deps: DomainsModuleDeps,
  overrides: DomainsModuleOverrides = {},
): DomainsModule {
  const domains = overrides.domains ?? postgresDomainRepository(deps.database)
  const listing = overrides.listing ?? postgresDomainListing(deps.database)

  return {
    findOrCreateDomain: findOrCreateDomain({
      domains,
      generateId: overrides.generateId ?? randomId,
      clock: deps.clock,
    }),
    archiveDomain: archiveDomain({ domains, publish: deps.publish, clock: deps.clock }),
    deleteDomain: deleteDomain(domains),
    getDomain: getDomain(domains),
    listDomains: listDomains(listing),
    listDomainNames: listDomainNames(domains),
  }
}
