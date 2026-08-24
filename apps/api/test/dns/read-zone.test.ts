import { describe, expect, test } from "bun:test"
import {
  createReadZone,
  type ReadZone,
  type ReadZoneDeps,
} from "../../src/dns/application/read-zone.ts"
import { createFindDelegation, withFailover } from "../../src/dns/domain/delegation.ts"
import type { DnsResolver, ZoneRepository } from "../../src/dns/domain/ports.ts"
import { createReadSoa } from "../../src/dns/domain/soa-lookup.ts"
import type { Zone } from "../../src/dns/domain/zone.ts"
import {
  type DnsFixtures,
  fakeNameserver,
  fakeResolver,
  unreachableResolver,
} from "../../src/dns/infra/fake-resolver.ts"
import { inMemoryZoneRepository } from "../../src/dns/infra/zone-repository.ts"
import { fixedClock } from "../../src/shared/clock.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const FIXTURES: DnsFixtures = {
  "acme.com|NS": {
    records: [
      { name: "acme.com", type: "NS", ttl: 3600, data: "ns1.cloudflare.com" },
      { name: "acme.com", type: "NS", ttl: 3600, data: "ns2.cloudflare.com" },
    ],
  },
  "acme.com|SOA": {
    records: [
      {
        name: "acme.com",
        type: "SOA",
        ttl: 300,
        data: "ns1.cloudflare.com hostmaster.acme.com 1 2 3 4 300",
      },
    ],
  },
}

type Options = {
  resolvers?: readonly DnsResolver[]
  zones?: ZoneRepository
  cacheTtlSeconds?: number
  fixtures?: DnsFixtures
}

function readZone(options: Options = {}): ReadZone {
  const fixtures = options.fixtures ?? FIXTURES
  const resolve = withFailover(options.resolvers ?? [fakeResolver(fixtures)])

  const deps: ReadZoneDeps = {
    findDelegation: createFindDelegation(resolve),
    readSoa: createReadSoa({
      askNameserver: fakeNameserver(fixtures),
      resolve,
      budgetMs: 2_500,
    }),
    zones: options.zones ?? inMemoryZoneRepository(),
    clock: fixedClock(NOW),
    cacheTtlSeconds: options.cacheTtlSeconds ?? 300,
  }

  return createReadZone(deps)
}

describe("readZone", () => {
  test("names the nameservers, the provider and the wait", async () => {
    const result = await readZone()({ name: "acme.com" })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.zone.nameservers).toEqual(["ns1.cloudflare.com", "ns2.cloudflare.com"])
    expect(result.value.zone.provider).toBe("cloudflare")
    expect(result.value.publishing).toEqual({ type: "known", minutes: 5 })
    expect(result.value.fromCache).toBe(false)
  })

  test("normalises what was typed before asking DNS anything", async () => {
    const result = await readZone()({ name: "HTTPS://WWW.Acme.com/pricing" })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.domain.ascii).toBe("acme.com")
  })

  test("walks up to the zone that actually answers", async () => {
    const result = await readZone()({ name: "app.staging.acme.com" })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.zone.name).toBe("acme.com")
    expect(result.value.domain.ascii).toBe("app.staging.acme.com")
  })

  test("refuses what is not a domain without asking DNS", async () => {
    const explode: DnsResolver = {
      id: "never",
      query: () => {
        throw new Error("DNS must not be asked about an invalid domain")
      },
    }
    const result = await readZone({ resolvers: [explode] })({ name: "not a domain" })
    expect(result).toEqual({
      ok: false,
      error: { type: "invalid_domain", reason: "not_a_hostname" },
    })
  })

  test("says no_delegation when DNS answered and the name has no nameservers", async () => {
    const result = await readZone({ fixtures: {} })({ name: "nothing-here.com" })
    expect(result).toEqual({
      ok: false,
      error: { type: "no_delegation", name: "nothing-here.com" },
    })
  })

  test("says unresolvable, not no_delegation, when no resolver answered", async () => {
    const result = await readZone({ resolvers: [unreachableResolver("dead")] })({
      name: "acme.com",
    })
    expect(result).toEqual({ ok: false, error: { type: "unresolvable" } })
  })

  test("still returns the zone when the SOA cannot be read", async () => {
    const nsOnly: DnsFixtures = {
      "acme.com|NS": {
        records: [{ name: "acme.com", type: "NS", ttl: 3600, data: "ns1.cloudflare.com" }],
      },
    }
    const result = await readZone({ fixtures: nsOnly })({ name: "acme.com" })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.zone.provider).toBe("cloudflare")
    expect(result.value.publishing).toEqual({ type: "unknown" })
  })

  test("falls back to the second resolver when the first will not answer", async () => {
    const result = await readZone({
      resolvers: [unreachableResolver("dead", "SERVFAIL"), fakeResolver(FIXTURES)],
    })({ name: "acme.com" })
    expect(result.ok).toBe(true)
  })
})

describe("the zone cache", () => {
  const stale: Zone = {
    name: "acme.com",
    nameservers: ["ns1.old.com"],
    provider: "other",
    soa: null,
    observedAt: new Date("2026-08-24T11:58:00Z"),
  }

  test("serves a fresh reading without asking DNS", async () => {
    const explode: DnsResolver = {
      id: "never",
      query: () => {
        throw new Error("a fresh cache entry must not reach DNS")
      },
    }
    const result = await readZone({
      zones: inMemoryZoneRepository([["acme.com", stale]]),
      resolvers: [explode],
    })({ name: "acme.com" })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.fromCache).toBe(true)
    expect(result.value.zone.nameservers).toEqual(["ns1.old.com"])
  })

  test("asks DNS again once the reading is older than the TTL", async () => {
    const result = await readZone({
      zones: inMemoryZoneRepository([["acme.com", stale]]),
      cacheTtlSeconds: 60,
    })({ name: "acme.com" })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.fromCache).toBe(false)
    expect(result.value.zone.nameservers).toEqual(["ns1.cloudflare.com", "ns2.cloudflare.com"])
  })

  test("keys the cache on the name that was asked for, not the zone that answered", async () => {
    const zones = inMemoryZoneRepository()
    await readZone({ zones })({ name: "app.staging.acme.com" })

    expect(await zones.findByRequestedName("app.staging.acme.com")).not.toBeNull()
  })
})
