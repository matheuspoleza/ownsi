import type { Clock } from "../shared/clock.ts"
import {
  type ClaimAction,
  createArchiveDomain,
  createCancelClaim,
  createRequestCheck,
} from "./application/claim-action.ts"
import { type ClaimDomain, createClaimDomain } from "./application/claim-domain.ts"
import { createViewDomain } from "./application/domain-view.ts"
import { createListDomains, type ListDomains } from "./application/list-domains.ts"
import { createReadDomain, type ReadDomain } from "./application/read-domain.ts"
import type {
  AccountDomainRepository,
  FindCoexistence,
  GenerateId,
  GenerateToken,
  StartDomain,
} from "./domain/ports.ts"
import type { DomainsConfig } from "./domains.config.ts"
import { coexistenceFromCatalogue, startFromCatalogue } from "./infra/demo-domains.ts"
import { randomId, randomToken } from "./infra/identifiers.ts"
import { inMemoryDomainRepository } from "./infra/in-memory-domain-repository.ts"

export type DomainsModuleDeps = {
  readonly config: DomainsConfig
  readonly clock: Clock
}

export type DomainsModuleOverrides = {
  readonly domains?: AccountDomainRepository
  readonly findCoexistence?: FindCoexistence
  readonly generateId?: GenerateId
  readonly generateToken?: GenerateToken
  readonly startDomain?: StartDomain
}

export type DomainsModule = {
  readonly claimDomain: ClaimDomain
  readonly listDomains: ListDomains
  readonly readDomain: ReadDomain
  readonly requestCheck: ClaimAction
  readonly cancelClaim: ClaimAction
  readonly archiveDomain: ClaimAction
}

export function createDomainsModule(
  deps: DomainsModuleDeps,
  overrides: DomainsModuleOverrides = {},
): DomainsModule {
  const domains = overrides.domains ?? inMemoryDomainRepository()
  const view = createViewDomain(overrides.findCoexistence ?? coexistenceFor(deps.config))
  const action = { domains, view, clock: deps.clock }

  return {
    claimDomain: createClaimDomain({
      domains,
      generateId: overrides.generateId ?? randomId,
      generateToken: overrides.generateToken ?? randomToken,
      startDomain: overrides.startDomain ?? startDomainFor(deps.config),
      view,
      clock: deps.clock,
    }),
    listDomains: createListDomains({ domains, view }),
    readDomain: createReadDomain({ domains, view }),
    requestCheck: createRequestCheck(action),
    cancelClaim: createCancelClaim(action),
    archiveDomain: createArchiveDomain(action),
  }
}

function startDomainFor(config: DomainsConfig): StartDomain {
  switch (config.driver) {
    case "demo":
      return startFromCatalogue
  }
}

function coexistenceFor(config: DomainsConfig): FindCoexistence {
  switch (config.driver) {
    case "demo":
      return coexistenceFromCatalogue
  }
}
