import type { DescribeZone } from "../zones/zones.contract.ts"
import { createCheckChallenge } from "./application/check-challenge.ts"
import { createCheckTxtChallenge } from "./application/txt-method.ts"
import type { CheckChallenge } from "./domain/attempt.ts"
import type { AskAuthoritativeTxt, LookupTxt } from "./domain/methods/txt/ports.ts"
import type { ReadZoneFacts } from "./domain/ports.ts"
import { nodeAuthoritativeTxt } from "./infra/authoritative-txt.ts"
import { dohTxtLookup } from "./infra/doh-txt.ts"
import { fakeAuthoritativeTxt, fakeTxtLookup } from "./infra/fake-txt.ts"
import { zoneFactsFrom } from "./infra/zone-facts.ts"
import type { VerificationConfig } from "./verification.config.ts"

export type VerificationModuleDeps = {
  readonly config: VerificationConfig
  readonly describeZone: DescribeZone
}

export type VerificationModuleOverrides = {
  readonly lookupTxt?: LookupTxt
  readonly askAuthoritative?: AskAuthoritativeTxt
  readonly readZoneFacts?: ReadZoneFacts
}

export type VerificationModule = {
  readonly checkChallenge: CheckChallenge
}

export function createVerificationModule(
  deps: VerificationModuleDeps,
  overrides: VerificationModuleOverrides = {},
): VerificationModule {
  const { config } = deps
  const faked = config.driver === "fake"

  const checkTxtChallenge = createCheckTxtChallenge({
    lookupTxt:
      overrides.lookupTxt ??
      (faked
        ? fakeTxtLookup({})
        : dohTxtLookup(config.recursiveResolvers, config.resolverTimeoutMs)),
    askAuthoritative:
      overrides.askAuthoritative ??
      (faked ? fakeAuthoritativeTxt({}) : nodeAuthoritativeTxt(config.authoritativeBudgetMs)),
    readZoneFacts: overrides.readZoneFacts ?? zoneFactsFrom(deps.describeZone),
  })

  return { checkChallenge: createCheckChallenge({ checkTxtChallenge }) }
}
