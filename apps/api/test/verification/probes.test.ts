import { describe, expect, test } from "bun:test"
import {
  challengeHost,
  DIAGNOSIS_CODES,
  type DiagnosisCode,
  explain,
} from "../../src/verification/domain/diagnosis.ts"
import { diagnoseTxt } from "../../src/verification/domain/methods/txt/diagnose.ts"
import {
  type HostRecords,
  type Quorum,
  quorum,
  type ResolverReading,
  type TxtChallenge,
  type TxtObservation,
} from "../../src/verification/domain/methods/txt/observation.ts"

const DOMAIN = "acme.com"
const HOST = challengeHost(DOMAIN)
const TOKEN = "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058"
const PREVIOUS = "ownsi_v1_4c07e9a2d61b83f5029ae7c4b1d6083f"
const FOREIGN = "ownsi_v1_1b8e0d4a37c95f26ae80b41d5c93f7e2"
const NAMESERVERS = ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"]
const RESOLVERS = ["Google", "Cloudflare", "Quad9"]

const CHALLENGE: TxtChallenge = { domain: DOMAIN, token: TOKEN, previousTokens: [PREVIOUS] }

const records = (name: string, over: Partial<HostRecords> = {}): HostRecords => ({
  name,
  presence: "present",
  txt: [],
  cname: null,
  otherTypes: [],
  ...over,
})

const atHost = (over: Partial<HostRecords> = {}): Quorum => ({
  type: "agreed",
  records: records(HOST, over),
})

const observation = (over: Partial<TxtObservation> = {}): TxtObservation => ({
  challenge: atHost({ presence: "nxdomain" }),
  apex: null,
  www: null,
  appended: null,
  authoritative: { type: "unknown" },
  ...over,
})

type Case = {
  readonly code: DiagnosisCode
  readonly shows: string
  readonly observation: TxtObservation
  readonly fixSays: string
}

const CASES: readonly Case[] = [
  {
    code: "cname_conflict",
    shows: "a CNAME already occupies the challenge host",
    observation: observation({ challenge: atHost({ cname: "proxy.example-cdn.net" }) }),
    fixSays: "Remove the CNAME",
  },
  {
    code: "value_formatted",
    shows: "the panel wrapped the value in quotes",
    observation: observation({ challenge: atHost({ txt: [`"${TOKEN}"`] }) }),
    fixSays: "no quotes and no surrounding spaces",
  },
  {
    code: "expired_token",
    shows: "the previous claim's record is still in the zone",
    observation: observation({ challenge: atHost({ txt: [PREVIOUS] }) }),
    fixSays: "already in the right place",
  },
  {
    code: "foreign_token",
    shows: "an ownsi token issued to somebody else",
    observation: observation({ challenge: atHost({ txt: [FOREIGN] }) }),
    fixSays: `Replace its value with ${TOKEN}`,
  },
  {
    code: "domain_appended",
    shows: "the panel appended the domain to the host field",
    observation: observation({
      appended: records(`${HOST}.${DOMAIN}`, { txt: [TOKEN] }),
    }),
    fixSays: "in the Host field",
  },
  {
    code: "record_at_apex",
    shows: "the token was pasted on the domain itself",
    observation: observation({ apex: records(DOMAIN, { txt: [TOKEN] }) }),
    fixSays: "Move the record",
  },
  {
    code: "record_on_www",
    shows: "the record went under www",
    observation: observation({
      www: records(`${challengeHost(`www.${DOMAIN}`)}`, { txt: [TOKEN] }),
    }),
    fixSays: "remove the one under www",
  },
  {
    code: "no_matching_record",
    shows: "other TXT records on the host, none of them the token",
    observation: observation({
      challenge: atHost({ txt: ["v=spf1 include:_spf.google.com ~all"] }),
    }),
    fixSays: "one more TXT record",
  },
  {
    code: "negative_cache",
    shows: "the authority has it and the resolvers still deny it",
    observation: observation({
      authoritative: { type: "holds", nameservers: NAMESERVERS, negativeCacheTtlSeconds: 240 },
    }),
    fixSays: "Nothing to do",
  },
  {
    code: "not_published",
    shows: "the authoritative nameservers never received it",
    observation: observation({
      authoritative: { type: "lacks", nameservers: NAMESERVERS },
    }),
    fixSays: "confirm it saved",
  },
  {
    code: "lame_delegation",
    shows: "the delegated nameservers do not answer",
    observation: observation({
      authoritative: { type: "silent", nameservers: NAMESERVERS },
    }),
    fixSays: "delegation problem at your provider",
  },
  {
    code: "record_absent",
    shows: "NXDOMAIN — the name does not exist at all",
    observation: observation({ challenge: atHost({ presence: "nxdomain" }) }),
    fixSays: `Create a TXT record on`,
  },
  {
    code: "record_absent",
    shows: "NODATA — the name exists, carrying the wrong type",
    observation: observation({
      challenge: atHost({ presence: "nodata", otherTypes: ["A", "AAAA"] }),
    }),
    fixSays: "only TXT can",
  },
  {
    code: "servfail",
    shows: "a broken zone, not a missing record",
    observation: observation({
      challenge: { type: "failed", failure: "servfail", resolvers: RESOLVERS },
    }),
    fixSays: "Check DNSSEC",
  },
]

describe("the thirteen probes", () => {
  test.each(CASES.map((entry) => [entry.shows, entry] as const))("%s", (_shows, entry) => {
    const outcome = diagnoseTxt(entry.observation, CHALLENGE)

    expect(outcome.type).toBe("absent")
    if (outcome.type !== "absent") return

    expect(outcome.diagnosis.code).toBe(entry.code)

    const { cause, fix } = explain(outcome.diagnosis, { domain: DOMAIN, token: TOKEN })
    expect(fix).toContain(entry.fixSays)
    expect(cause.length).toBeGreaterThan(0)
  })

  test("every code in the catalogue has a fixture that reproduces it", () => {
    const reproduced = new Set(CASES.map((entry) => entry.code))

    expect([...reproduced].sort()).toEqual([...DIAGNOSIS_CODES].sort())
  })
})

describe("the three outcomes", () => {
  test("the token at the challenge host is the only thing that proves it", () => {
    const outcome = diagnoseTxt(observation({ challenge: atHost({ txt: [TOKEN] }) }), CHALLENGE)

    expect(outcome).toEqual({ type: "found", value: TOKEN })
  })

  test("our failure to reach DNS is never a statement about the domain", () => {
    const outcome = diagnoseTxt(
      observation({ challenge: { type: "failed", failure: "unreachable", resolvers: RESOLVERS } }),
      CHALLENGE,
    )

    expect(outcome).toEqual({ type: "unresolvable", resolvers: RESOLVERS })
  })

  test("a broken zone is the domain's problem, and keeps its own name", () => {
    const outcome = diagnoseTxt(
      observation({ challenge: { type: "failed", failure: "servfail", resolvers: RESOLVERS } }),
      CHALLENGE,
    )

    expect(outcome.type).toBe("absent")
  })
})

describe("the quorum of three", () => {
  const answering = (resolver: string, txt: readonly string[]): ResolverReading => ({
    resolver,
    type: "answered",
    records: records(HOST, { txt }),
  })

  test("the majority decides while the record is still spreading", () => {
    const decided = quorum([
      answering("Google", [TOKEN]),
      answering("Cloudflare", []),
      answering("Quad9", []),
    ])

    expect(decided).toEqual({ type: "agreed", records: records(HOST, { txt: [] }) })
  })

  test("one resolver holding out does not overturn the other two", () => {
    const decided = quorum([
      answering("Google", [TOKEN]),
      answering("Cloudflare", [TOKEN]),
      answering("Quad9", []),
    ])

    expect(decided).toEqual({ type: "agreed", records: records(HOST, { txt: [TOKEN] }) })
  })

  test("a majority of SERVFAIL is a statement about the zone", () => {
    const decided = quorum([
      { resolver: "Google", type: "failed", failure: "servfail" },
      { resolver: "Cloudflare", type: "failed", failure: "servfail" },
      answering("Quad9", []),
    ])

    expect(decided).toEqual({
      type: "failed",
      failure: "servfail",
      resolvers: ["Google", "Cloudflare"],
    })
  })

  test("nobody answering is our failure, not the domain's", () => {
    const decided = quorum([
      { resolver: "Google", type: "failed", failure: "unreachable" },
      { resolver: "Cloudflare", type: "failed", failure: "unreachable" },
      { resolver: "Quad9", type: "failed", failure: "unreachable" },
    ])

    expect(decided).toEqual({
      type: "failed",
      failure: "unreachable",
      resolvers: RESOLVERS,
    })
  })
})
