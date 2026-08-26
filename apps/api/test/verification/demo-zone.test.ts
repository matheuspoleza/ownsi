import { describe, expect, test } from "bun:test"
import { DEMO_ZONE } from "../../src/verification/domain/demo-zone.ts"
import { challengeHost } from "../../src/verification/domain/diagnosis.ts"
import { checkTxtChallenge } from "../../src/verification/domain/methods/txt/check.ts"
import type { TxtChallenge } from "../../src/verification/domain/methods/txt/observation.ts"
import type { LookupTxt } from "../../src/verification/domain/methods/txt/ports.ts"
import { demoZoneTxtLookup } from "../../src/verification/infra/demo-zone.service.ts"
import {
  fakeAuthoritativeTxt,
  fakeTxtLookup,
} from "../../src/verification/infra/fake-txt.service.ts"

const DEMO_DOMAIN = `acme.${DEMO_ZONE}`
const TOKEN = "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058"
const OTHER_TOKEN = "ownsi_v1_0b1c2d3e4f5a69788796a5b4c3d2e1f0"
const RESOLVERS = ["cloudflare", "google", "quad9"]

const NEVER_ASKED: LookupTxt = async () => {
  throw new Error("the demo zone answered elsewhere")
}

function lookup(pending: Record<string, readonly string[]>, elsewhere: LookupTxt = NEVER_ASKED) {
  return demoZoneTxtLookup({
    readPendingTokens: async (domain) => pending[domain] ?? [],
    resolvers: RESOLVERS,
    elsewhere,
  })
}

describe("the demo zone", () => {
  test("holds the token of every claim running against a demo name", async () => {
    const readings = await lookup({ [DEMO_DOMAIN]: [TOKEN, OTHER_TOKEN] })(
      challengeHost(DEMO_DOMAIN),
    )

    expect(readings).toHaveLength(RESOLVERS.length)
    for (const reading of readings) {
      expect(reading).toMatchObject({ type: "answered", records: { presence: "present" } })
    }
  })

  test("holds nothing at a demo name no claim is running against", async () => {
    const readings = await lookup({})(challengeHost(DEMO_DOMAIN))

    expect(readings[0]).toMatchObject({ records: { presence: "nxdomain", txt: [] } })
  })

  test("holds nothing at the demo name itself, only at its challenge host", async () => {
    const readings = await lookup({ [DEMO_DOMAIN]: [TOKEN] })(DEMO_DOMAIN)

    expect(readings[0]).toMatchObject({ records: { presence: "nxdomain" } })
  })

  test("leaves every other name to real DNS", async () => {
    const answering = lookup({}, fakeTxtLookup({ "_ownsi-challenge.acme.com": { txt: [TOKEN] } }))
    const readings = await answering(challengeHost("acme.com"))

    expect(readings[0]).toMatchObject({ records: { presence: "present", txt: [TOKEN] } })
  })

  test("proves a demo claim without anyone touching a DNS panel", async () => {
    const challenge: TxtChallenge = { domain: DEMO_DOMAIN, token: TOKEN, previousTokens: [] }

    const outcome = await checkTxtChallenge({
      lookupTxt: lookup({ [DEMO_DOMAIN]: [TOKEN] }),
      askAuthoritative: fakeAuthoritativeTxt({}),
      readZoneFacts: async () => ({ type: "unknown" }),
    })(challenge)

    expect(outcome).toEqual({ type: "found", value: TOKEN })
  })

  test("proves nothing at a demo name whose claim was never opened", async () => {
    const challenge: TxtChallenge = { domain: DEMO_DOMAIN, token: TOKEN, previousTokens: [] }

    const outcome = await checkTxtChallenge({
      lookupTxt: lookup({}),
      askAuthoritative: fakeAuthoritativeTxt({}),
      readZoneFacts: async () => ({ type: "unknown" }),
    })(challenge)

    expect(outcome.type).toBe("absent")
  })
})
