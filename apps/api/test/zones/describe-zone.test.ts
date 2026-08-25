import { describe, expect, test } from "bun:test"
import { fixedClock } from "../../src/shared/clock.ts"
import { describeZone } from "../../src/zones/application/describe-zone.query.ts"
import { type GetZone, getZone } from "../../src/zones/application/get-zone.query.ts"
import { createFindDelegation, withFailover } from "../../src/zones/domain/delegation.ts"
import { createReadSoa } from "../../src/zones/domain/soa-lookup.ts"
import {
  type DnsFixtures,
  fakeNameserver,
  fakeResolver,
  unreachableResolver,
} from "../../src/zones/infra/fake-resolver.service.ts"
import type { DescribeZone } from "../../src/zones/zones.contract.ts"
import { inMemoryZoneRepository } from "./in-memory-zone-repository.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const NAMESERVERS = ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"]

const DELEGATED: DnsFixtures = {
  "acme.com|NS": {
    records: NAMESERVERS.map((data) => ({ name: "acme.com", type: "NS", ttl: 3600, data })),
  },
  "acme.com|SOA": {
    records: [
      {
        name: "acme.com",
        type: "SOA",
        ttl: 300,
        data: "kate.ns.cloudflare.com hostmaster.acme.com 1 2 3 4 240",
      },
    ],
  },
}

const SILENT: DnsFixtures = { "acme.com|NS": DELEGATED["acme.com|NS"] as DnsFixtures[string] }

function describer(fixtures: DnsFixtures, unreachable = false): DescribeZone {
  const resolve = withFailover([
    unreachable ? unreachableResolver("google") : fakeResolver(fixtures),
  ])

  const readZone: GetZone = getZone({
    findDelegation: createFindDelegation(resolve),
    readSoa: createReadSoa({ askNameserver: fakeNameserver(fixtures), resolve, budgetMs: 100 }),
    zones: inMemoryZoneRepository(),
    clock: fixedClock(NOW),
    cacheTtlSeconds: 300,
  })

  return describeZone(readZone)
}

describe("the zone another context may speak about", () => {
  test("names the nameservers and how long a denial stays cached", async () => {
    const description = await describer(DELEGATED)("acme.com")

    expect(description).toEqual({
      type: "delegated",
      zoneName: "acme.com",
      nameservers: ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"],
      authority: { type: "answered", negativeCacheTtlSeconds: 240 },
    })
  })

  test("separates a delegation whose nameservers never answered from one that did", async () => {
    const description = await describer(SILENT)("acme.com")

    expect(description).toEqual({
      type: "delegated",
      zoneName: "acme.com",
      nameservers: ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"],
      authority: { type: "silent" },
    })
  })

  test("a name nobody delegates is not the same as a name nobody could read", async () => {
    expect(await describer({})("acme.com")).toEqual({
      type: "not_delegated",
      name: "acme.com",
    })

    expect(await describer({}, true)("acme.com")).toEqual({
      type: "unreadable",
      reason: "unreachable",
    })
  })

  test("a name that is not a name at all says so", async () => {
    expect(await describer(DELEGATED)("not a domain")).toEqual({
      type: "unreadable",
      reason: "invalid_name",
    })
  })

  test("carries nothing of the zone beyond what it publishes", async () => {
    const description = await describer(DELEGATED)("acme.com")

    expect(Object.keys(description).sort()).toEqual([
      "authority",
      "nameservers",
      "type",
      "zoneName",
    ])
  })
})
