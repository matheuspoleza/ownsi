import { describe, expect, test } from "bun:test"
import { challengeHost } from "../../src/verification/domain/diagnosis.ts"
import {
  type CheckTxtChallenge,
  checkTxtChallenge,
} from "../../src/verification/domain/methods/txt/check.ts"
import type { TxtChallenge } from "../../src/verification/domain/methods/txt/observation.ts"
import type {
  AskAuthoritativeTxt,
  LookupTxt,
} from "../../src/verification/domain/methods/txt/ports.ts"
import type { ReadZoneFacts } from "../../src/verification/domain/ports.ts"
import {
  fakeAuthoritativeTxt,
  fakeTxtLookup,
  type TxtFixtures,
  unreachableTxtLookup,
} from "../../src/verification/infra/fake-txt.service.ts"

const DOMAIN = "acme.com"
const HOST = challengeHost(DOMAIN)
const TOKEN = "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058"
const NAMESERVERS = ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"]

const CHALLENGE: TxtChallenge = { domain: DOMAIN, token: TOKEN, previousTokens: [] }

const answering: ReadZoneFacts = async () => ({
  type: "answering",
  nameservers: NAMESERVERS,
  negativeCacheTtlSeconds: 240,
})

type Options = {
  lookupTxt?: LookupTxt
  askAuthoritative?: AskAuthoritativeTxt
  readZoneFacts?: ReadZoneFacts
}

function check(fixtures: TxtFixtures, options: Options = {}): CheckTxtChallenge {
  return checkTxtChallenge({
    lookupTxt: options.lookupTxt ?? fakeTxtLookup(fixtures),
    askAuthoritative: options.askAuthoritative ?? fakeAuthoritativeTxt({}),
    readZoneFacts: options.readZoneFacts ?? (async () => ({ type: "unknown" })),
  })
}

describe("checking a TXT challenge", () => {
  test("the token at the challenge host proves it", async () => {
    const outcome = await check({ [HOST]: { txt: [TOKEN] } })(CHALLENGE)

    expect(outcome).toEqual({ type: "found", value: TOKEN })
  })

  test("names where the record actually landed", async () => {
    const outcome = await check({ [DOMAIN]: { txt: [TOKEN] } })(CHALLENGE)

    expect(outcome).toMatchObject({
      type: "absent",
      diagnosis: { code: "record_at_apex", observed: { name: DOMAIN } },
    })
  })

  test("resolvers that cannot be reached never accuse the domain", async () => {
    const outcome = await check({}, { lookupTxt: unreachableTxtLookup() })(CHALLENGE)

    expect(outcome.type).toBe("unresolvable")
  })

  test("the authority holding it turns waiting into a number", async () => {
    const outcome = await check(
      {},
      {
        readZoneFacts: answering,
        askAuthoritative: fakeAuthoritativeTxt({ [HOST]: { txt: [TOKEN] } }),
      },
    )(CHALLENGE)

    expect(outcome).toMatchObject({
      type: "absent",
      diagnosis: { code: "negative_cache", observed: { secondsRemaining: 240 } },
    })
  })

  test("the authority lacking it names the nameservers that answered", async () => {
    const outcome = await check({}, { readZoneFacts: answering })(CHALLENGE)

    expect(outcome).toMatchObject({
      type: "absent",
      diagnosis: { code: "not_published", observed: { nameservers: NAMESERVERS } },
    })
  })

  test("the authority is asked only once the recursive answer came back negative", async () => {
    const asked: string[] = []
    const askAuthoritative: AskAuthoritativeTxt = async (name, nameservers) => {
      asked.push(name)
      return { type: "answered", nameservers, txt: [] }
    }

    await check(
      { [HOST]: { txt: [TOKEN] } },
      { readZoneFacts: answering, askAuthoritative },
    )(CHALLENGE)
    expect(asked).toEqual([])

    await check({}, { readZoneFacts: answering, askAuthoritative })(CHALLENGE)
    expect(asked).toEqual([HOST])
  })

  test("a zone nobody could read leaves the record absent, not blamed on the zone", async () => {
    const outcome = await check({})(CHALLENGE)

    expect(outcome).toMatchObject({
      type: "absent",
      diagnosis: { code: "record_absent" },
    })
  })
})
