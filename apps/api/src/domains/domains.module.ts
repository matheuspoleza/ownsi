import type { Clock } from "../shared/clock.ts"
import { type ClaimDomain, createClaimDomain } from "./application/claim-domain.ts"
import { createListClaims, type ListClaims } from "./application/list-claims.ts"
import { createReadClaim, type ReadClaim } from "./application/read-claim.ts"
import {
  createArchiveClaim,
  createRequestCheck,
  createRestoreClaim,
  type TransitionClaim,
} from "./application/transition-claim.ts"
import type { ClaimRepository, GenerateId, GenerateToken, StartClaim } from "./domain/ports.ts"
import type { DomainsConfig } from "./domains.config.ts"
import { startFromCatalogue } from "./infra/demo-claims.ts"
import { randomId, randomToken } from "./infra/identifiers.ts"
import { inMemoryClaimRepository } from "./infra/in-memory-claim-repository.ts"

export type DomainsModuleDeps = {
  readonly config: DomainsConfig
  readonly clock: Clock
}

export type DomainsModuleOverrides = {
  readonly claims?: ClaimRepository
  readonly generateId?: GenerateId
  readonly generateToken?: GenerateToken
  readonly startClaim?: StartClaim
}

export type DomainsModule = {
  readonly claimDomain: ClaimDomain
  readonly listClaims: ListClaims
  readonly readClaim: ReadClaim
  readonly requestCheck: TransitionClaim
  readonly archiveClaim: TransitionClaim
  readonly restoreClaim: TransitionClaim
}

export function createDomainsModule(
  deps: DomainsModuleDeps,
  overrides: DomainsModuleOverrides = {},
): DomainsModule {
  const claims = overrides.claims ?? inMemoryClaimRepository()
  const startClaim = overrides.startClaim ?? startClaimFor(deps.config)

  return {
    claimDomain: createClaimDomain({
      claims,
      generateId: overrides.generateId ?? randomId,
      generateToken: overrides.generateToken ?? randomToken,
      startClaim,
      clock: deps.clock,
    }),
    listClaims: createListClaims({ claims }),
    readClaim: createReadClaim({ claims }),
    requestCheck: createRequestCheck({ claims }),
    archiveClaim: createArchiveClaim({ claims }),
    restoreClaim: createRestoreClaim({ claims }),
  }
}

function startClaimFor(config: DomainsConfig): StartClaim {
  switch (config.driver) {
    case "demo":
      return startFromCatalogue
  }
}
