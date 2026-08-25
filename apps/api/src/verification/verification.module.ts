import type { Publish } from "../shared/bus.ts"
import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import { randomId } from "../shared/identifiers.ts"
import type { DescribeZone } from "../zones/zones.contract.ts"
import type { CreateVerification } from "./application/create-verification.use-case.ts"
import { createVerification } from "./application/create-verification.use-case.ts"
import { type GetVerification, getVerification } from "./application/get-verification.query.ts"
import { type ListAttempts, listAttempts } from "./application/list-attempts.query.ts"
import { type RunVerification, runVerification } from "./application/run-verification.use-case.ts"
import {
  type StopVerification,
  stopVerification,
} from "./application/stop-verification.use-case.ts"
import {
  type VerifyUntilDeadline,
  verifyUntilDeadline,
} from "./application/verify-until-deadline.schedule.ts"
import type { CheckChallenge } from "./domain/attempt.ts"
import { checkChallenge } from "./domain/methods/check-challenge.ts"
import { checkTxtChallenge } from "./domain/methods/txt/check.ts"
import type { AskAuthoritativeTxt, LookupTxt } from "./domain/methods/txt/ports.ts"
import type {
  GenerateId,
  ReadZoneFacts,
  ScheduleVerification,
  StopSchedule,
  VerificationRepository,
} from "./domain/ports.ts"
import { nodeAuthoritativeTxt } from "./infra/authoritative-txt.service.ts"
import { dohTxtLookup } from "./infra/doh-txt-lookup.service.ts"
import { fakeAuthoritativeTxt, fakeTxtLookup } from "./infra/fake-txt.service.ts"
import { postgresVerificationRepository } from "./infra/verification.repository.ts"
import { zoneFactsFrom } from "./infra/zone-facts.service.ts"
import type { VerificationConfig } from "./verification.config.ts"
import type { VerificationEvent } from "./verification.contract.ts"

export type VerificationModuleDeps = {
  readonly config: VerificationConfig
  readonly clock: Clock
  readonly database: Database
  readonly describeZone: DescribeZone
  readonly publish: Publish<VerificationEvent>
  readonly schedule: ScheduleVerification
  readonly stopSchedule: StopSchedule
}

export type VerificationModuleOverrides = {
  readonly lookupTxt?: LookupTxt
  readonly askAuthoritative?: AskAuthoritativeTxt
  readonly readZoneFacts?: ReadZoneFacts
  readonly checkChallenge?: CheckChallenge
  readonly verifications?: VerificationRepository
  readonly generateId?: GenerateId
}

export type VerificationModule = {
  readonly createVerification: CreateVerification
  readonly runVerification: RunVerification
  readonly stopVerification: StopVerification
  readonly getVerification: GetVerification
  readonly listAttempts: ListAttempts
  readonly verifyUntilDeadline: VerifyUntilDeadline
  readonly clock: Clock
}

export function createVerificationModule(
  deps: VerificationModuleDeps,
  overrides: VerificationModuleOverrides = {},
): VerificationModule {
  const verifications = overrides.verifications ?? postgresVerificationRepository(deps.database)
  const generateId = overrides.generateId ?? randomId

  const run = runVerification({
    verifications,
    checkChallenge: overrides.checkChallenge ?? dnsChallengeCheck(deps, overrides),
    publish: deps.publish,
    generateId,
    clock: deps.clock,
  })

  return {
    createVerification: createVerification({
      verifications,
      schedule: deps.schedule,
      generateId,
      clock: deps.clock,
    }),
    runVerification: run,
    stopVerification: stopVerification({ verifications, stopSchedule: deps.stopSchedule }),
    getVerification: getVerification(verifications),
    listAttempts: listAttempts(verifications),
    verifyUntilDeadline: verifyUntilDeadline({ verifications, runVerification: run }),
    clock: deps.clock,
  }
}

function dnsChallengeCheck(
  deps: VerificationModuleDeps,
  overrides: VerificationModuleOverrides,
): CheckChallenge {
  const { config } = deps
  const faked = config.driver === "fake"

  return checkChallenge({
    checkTxtChallenge: checkTxtChallenge({
      lookupTxt:
        overrides.lookupTxt ??
        (faked
          ? fakeTxtLookup({})
          : dohTxtLookup(config.recursiveResolvers, config.resolverTimeoutMs)),
      askAuthoritative:
        overrides.askAuthoritative ??
        (faked ? fakeAuthoritativeTxt({}) : nodeAuthoritativeTxt(config.authoritativeBudgetMs)),
      readZoneFacts: overrides.readZoneFacts ?? zoneFactsFrom(deps.describeZone),
    }),
  })
}
