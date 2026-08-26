import type { Publish } from "../shared/bus.ts"
import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import type { SendEmail } from "../shared/email.ts"
import { randomId } from "../shared/identifiers.ts"
import { type CancelClaim, cancelClaim } from "./application/cancel-claim.use-case.ts"
import { type CreateClaim, createClaim } from "./application/create-claim.use-case.ts"
import { type ExpireClaim, expireClaim } from "./application/expire-claim.use-case.ts"
import { type GetClaim, getClaim } from "./application/get-claim.query.ts"
import { type GetClaimStanding, getClaimStanding } from "./application/get-claim-standing.query.ts"
import { type GetLatestProof, getLatestProof } from "./application/get-latest-proof.query.ts"
import { type ListClaims, listClaims } from "./application/list-claims.query.ts"
import { type NotifyClaimant, notifyClaimant } from "./application/notify-claimant.use-case.ts"
import { type ProveClaim, proveClaim } from "./application/prove-claim.use-case.ts"
import type { ClaimsConfig } from "./claims.config.ts"
import type { ClaimEvent } from "./claims.contract.ts"
import type {
  ClaimRepository,
  FindCoexistence,
  FindDomain,
  FindDomains,
  FindLatestProof,
  FindOtherClaimants,
  FindRecipient,
  GenerateId,
  GenerateToken,
  PublishProof,
  SendNotice,
  SentNotices,
  StartVerifying,
  StopVerifying,
} from "./domain/ports.ts"
import { postgresClaimRepository } from "./infra/claim.repository.ts"
import { emailTheClaimant } from "./infra/claim-mailer.service.ts"
import { postgresClaimNotices } from "./infra/claim-notice.repository.ts"
import {
  postgresCoexistence,
  postgresLatestProof,
  postgresOtherClaimants,
} from "./infra/coexistence.repository.ts"
import { atMostDaily } from "./infra/notice-ceiling.service.ts"
import { bestEffort } from "./infra/notice-delivery.service.ts"
import { postgresRecipients } from "./infra/recipient.repository.ts"
import { randomToken } from "./infra/token.service.ts"

export type ClaimsModuleDeps = {
  readonly config: ClaimsConfig
  readonly clock: Clock
  readonly database: Database
  readonly sendEmail: SendEmail
  readonly findDomain: FindDomain
  readonly findDomains: FindDomains
  readonly startVerifying: StartVerifying
  readonly stopVerifying: StopVerifying
  readonly publishProof: PublishProof
  readonly publish: Publish<ClaimEvent>
}

export type ClaimsModuleOverrides = {
  readonly claims?: ClaimRepository
  readonly sendNotice?: SendNotice
  readonly sentNotices?: SentNotices
  readonly findRecipient?: FindRecipient
  readonly findCoexistence?: FindCoexistence
  readonly findLatestProof?: FindLatestProof
  readonly otherClaimants?: FindOtherClaimants
  readonly generateId?: GenerateId
  readonly generateToken?: GenerateToken
}

export type ClaimsModule = {
  readonly createClaim: CreateClaim
  readonly cancelClaim: CancelClaim
  readonly proveClaim: ProveClaim
  readonly expireClaim: ExpireClaim
  readonly notifyClaimant: NotifyClaimant
  readonly getClaim: GetClaim
  readonly getClaimStanding: GetClaimStanding
  readonly getLatestProof: GetLatestProof
  readonly listClaims: ListClaims
}

export function createClaimsModule(
  deps: ClaimsModuleDeps,
  overrides: ClaimsModuleOverrides = {},
): ClaimsModule {
  const claims = overrides.claims ?? postgresClaimRepository(deps.database)
  const findCoexistence = overrides.findCoexistence ?? postgresCoexistence(deps.database)
  const findLatestProof = overrides.findLatestProof ?? postgresLatestProof(deps.database)
  const findRecipient = overrides.findRecipient ?? postgresRecipients(deps.database)
  const { findDomain } = deps

  const sendNotice = bestEffort(
    atMostDaily({
      sendNotice:
        overrides.sendNotice ??
        emailTheClaimant({
          sendEmail: deps.sendEmail,
          findRecipient,
          appUrl: deps.config.appUrl,
        }),
      sent: overrides.sentNotices ?? postgresClaimNotices(deps.database),
      clock: deps.clock,
    }),
  )

  return {
    createClaim: createClaim({
      claims,
      findDomain,
      findCoexistence,
      startVerifying: deps.startVerifying,
      sendNotice,
      generateId: overrides.generateId ?? randomId,
      generateToken: overrides.generateToken ?? randomToken,
      clock: deps.clock,
    }),
    cancelClaim: cancelClaim({
      claims,
      findDomain,
      stopVerifying: deps.stopVerifying,
      publish: deps.publish,
      clock: deps.clock,
    }),
    proveClaim: proveClaim({
      claims,
      findDomain,
      otherClaimants: overrides.otherClaimants ?? postgresOtherClaimants(deps.database),
      findRecipient,
      publishProof: deps.publishProof,
      sendNotice,
      publish: deps.publish,
    }),
    expireClaim: expireClaim({ claims, findDomain, sendNotice, publish: deps.publish }),
    notifyClaimant: notifyClaimant({ claims, findDomain, sendNotice }),
    getClaim: getClaim({ claims, findDomain, findCoexistence }),
    getClaimStanding: getClaimStanding({ claims, findDomain }),
    getLatestProof: getLatestProof({ findLatestProof }),
    listClaims: listClaims({ claims, findDomains: deps.findDomains }),
  }
}
