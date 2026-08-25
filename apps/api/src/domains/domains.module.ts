import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import type { SendEmail } from "../shared/email.ts"
import { randomId } from "../shared/identifiers.ts"
import type { CheckChallenge } from "../verification/verification.contract.ts"
import { announceOncePerDay } from "./application/announce-once.ts"
import { createCheckWhenDue } from "./application/check-when-due.ts"
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
import { createRunAttempt } from "./application/run-attempt.ts"
import { startAccountDomain } from "./domain/account-domain.ts"
import type {
  AccountDomainRepository,
  AnnounceClaim,
  CheckClaim,
  CheckWhenDue,
  FindCoexistence,
  FindOtherClaimants,
  GenerateId,
  GenerateToken,
  ScheduleClaim,
  SentNotices,
  StartDomain,
} from "./domain/ports.ts"
import type { DomainsConfig } from "./domains.config.ts"
import { checkClaimByDnsTxt } from "./infra/claim-check.ts"
import { postgresCoexistence, postgresOtherClaimants } from "./infra/coexistence.ts"
import { coexistenceFromCatalogue, startFromCatalogue } from "./infra/demo-domains.ts"
import { postgresDomainRepository } from "./infra/domain-repository.ts"
import { randomToken } from "./infra/identifiers.ts"
import { emailTheClaimant } from "./infra/notice-email.ts"
import { postgresSentNotices } from "./infra/notice-log.ts"
import { postgresRecipients } from "./infra/recipients.ts"

export type DomainsModuleDeps = {
  readonly config: DomainsConfig
  readonly clock: Clock
  readonly database: Database
  readonly checkChallenge: CheckChallenge
  readonly scheduleClaim: ScheduleClaim
  readonly sendEmail: SendEmail
}

export type DomainsModuleOverrides = {
  readonly domains?: AccountDomainRepository
  readonly checkClaim?: CheckClaim
  readonly announce?: AnnounceClaim
  readonly sentNotices?: SentNotices
  readonly otherClaimants?: FindOtherClaimants
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
  readonly checkWhenDue: CheckWhenDue
  readonly cancelClaim: ClaimAction
  readonly archiveDomain: ClaimAction
}

export function createDomainsModule(
  deps: DomainsModuleDeps,
  overrides: DomainsModuleOverrides = {},
): DomainsModule {
  const domains = overrides.domains ?? postgresDomainRepository(deps.database)
  const view = createViewDomain(overrides.findCoexistence ?? coexistenceFor(deps))
  const action = { domains, view, clock: deps.clock }

  const runAttempt = createRunAttempt({
    checkClaim: overrides.checkClaim ?? checkClaimByDnsTxt(deps.checkChallenge),
    announce: announceOncePerDay({
      announce: overrides.announce ?? emailTheClaimant(mailingFor(deps)),
      sent: overrides.sentNotices ?? postgresSentNotices(deps.database),
      clock: deps.clock,
    }),
    otherClaimants: overrides.otherClaimants ?? postgresOtherClaimants(deps.database),
  })

  return {
    claimDomain: createClaimDomain({
      domains,
      generateId: overrides.generateId ?? randomId,
      generateToken: overrides.generateToken ?? randomToken,
      startDomain: overrides.startDomain ?? startDomainFor(deps.config),
      scheduleClaim: deps.scheduleClaim,
      view,
      clock: deps.clock,
    }),
    listDomains: createListDomains({ domains, view }),
    readDomain: createReadDomain({ domains, view }),
    requestCheck: createRequestCheck({ ...action, runAttempt }),
    checkWhenDue: createCheckWhenDue({ domains, runAttempt, clock: deps.clock }),
    cancelClaim: createCancelClaim(action),
    archiveDomain: createArchiveDomain(action),
  }
}

function mailingFor(deps: DomainsModuleDeps) {
  return {
    sendEmail: deps.sendEmail,
    findRecipient: postgresRecipients(deps.database),
    appUrl: deps.config.appUrl,
  }
}

function startDomainFor(config: DomainsConfig): StartDomain {
  switch (config.driver) {
    case "postgres":
      return startAccountDomain
    case "demo":
      return startFromCatalogue
  }
}

function coexistenceFor(deps: DomainsModuleDeps): FindCoexistence {
  switch (deps.config.driver) {
    case "postgres":
      return postgresCoexistence(deps.database)
    case "demo":
      return coexistenceFromCatalogue
  }
}
