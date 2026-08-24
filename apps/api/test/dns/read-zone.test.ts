import { describe, expect, test } from "bun:test"
import {
  createReadZone,
  type ReadZone,
  type ReadZoneDeps,
  type ZoneStep,
} from "../../src/dns/application/read-zone.ts"
import { createFindDelegation, withFailover } from "../../src/dns/domain/delegation.ts"
import type { DnsResolver, ZoneRepository } from "../../src/dns/domain/ports.ts"
import { createReadSoa, type ReadSoa } from "../../src/dns/domain/soa-lookup.ts"
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
  readSoa?: ReadSoa
}

function readZone(options: Options = {}): ReadZone {
  const fixtures = options.fixtures ?? FIXTURES
  const resolve = withFailover(options.resolvers ?? [fakeResolver(fixtures)])

  const deps: ReadZoneDeps = {
    findDelegation: createFindDelegation(resolve),
    readSoa:
      options.readSoa ??
      createReadSoa({
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

async function collect(steps: AsyncGenerator<ZoneStep, void>): Promise<ZoneStep[]> {
  const collected: ZoneStep[] = []
  for await (const step of steps) collected.push(step)
  return collected
}

function delegationOf(steps: readonly ZoneStep[]): Extract<ZoneStep, { type: "delegated" }> {
  const step = steps.find((candidate) => candidate.type === "delegated")
  if (!step) throw new Error(`No delegation in ${JSON.stringify(steps)}`)
  return step
}

function publishingOf(steps: readonly ZoneStep[]): Extract<ZoneStep, { type: "published" }> {
  const step = steps.find((candidate) => candidate.type === "published")
  if (!step) throw new Error(`No publishing in ${JSON.stringify(steps)}`)
  return step
}

describe("readZone", () => {
  test("names the nameservers, the provider and the wait", async () => {
    const steps = await collect(readZone()({ name: "acme.com" }))

    expect(steps.map((step) => step.type)).toEqual(["delegated", "published"])
    expect(delegationOf(steps).zone.nameservers).toEqual([
      "ns1.cloudflare.com",
      "ns2.cloudflare.com",
    ])
    expect(delegationOf(steps).zone.provider).toBe("cloudflare")
    expect(delegationOf(steps).fromCache).toBe(false)
    expect(publishingOf(steps).publishing).toEqual({ type: "known", minutes: 5 })
  })

  test("names the provider before it has read the SOA", async () => {
    let soaAsked = false
    const generator = readZone({
      readSoa: async () => {
        soaAsked = true
        return null
      },
    })({ name: "acme.com" })

    const first = await generator.next()

    expect(first.value).toMatchObject({ type: "delegated" })
    expect(soaAsked).toBe(false)
  })

  test("normalises what was typed before asking DNS anything", async () => {
    const steps = await collect(readZone()({ name: "HTTPS://WWW.Acme.com/pricing" }))
    expect(delegationOf(steps).domain.ascii).toBe("acme.com")
  })

  test("walks up to the zone that actually answers", async () => {
    const steps = await collect(readZone()({ name: "app.staging.acme.com" }))

    expect(delegationOf(steps).zone.name).toBe("acme.com")
    expect(delegationOf(steps).domain.ascii).toBe("app.staging.acme.com")
  })

  test("refuses what is not a domain without asking DNS", async () => {
    const explode: DnsResolver = {
      id: "never",
      query: () => {
        throw new Error("DNS must not be asked about an invalid domain")
      },
    }
    const steps = await collect(readZone({ resolvers: [explode] })({ name: "not a domain" }))

    expect(steps).toEqual([
      { type: "failed", error: { type: "invalid_domain", reason: "not_a_hostname" } },
    ])
  })

  test("says no_delegation when DNS answered and the name has no nameservers", async () => {
    const steps = await collect(readZone({ fixtures: {} })({ name: "nothing-here.com" }))

    expect(steps).toEqual([
      { type: "failed", error: { type: "no_delegation", name: "nothing-here.com" } },
    ])
  })

  test("says unresolvable, not no_delegation, when no resolver answered", async () => {
    const steps = await collect(
      readZone({ resolvers: [unreachableResolver("dead")] })({ name: "acme.com" }),
    )

    expect(steps).toEqual([{ type: "failed", error: { type: "unresolvable" } }])
  })

  test("fails before it names a provider, never halfway through the stream", async () => {
    const steps = await collect(
      readZone({ resolvers: [unreachableResolver("dead")] })({ name: "acme.com" }),
    )

    expect(steps.some((step) => step.type === "delegated")).toBe(false)
  })

  test("still names the provider when the SOA cannot be read", async () => {
    const nsOnly: DnsFixtures = {
      "acme.com|NS": {
        records: [{ name: "acme.com", type: "NS", ttl: 3600, data: "ns1.cloudflare.com" }],
      },
    }
    const steps = await collect(readZone({ fixtures: nsOnly })({ name: "acme.com" }))

    expect(delegationOf(steps).zone.provider).toBe("cloudflare")
    expect(publishingOf(steps).publishing).toEqual({ type: "unknown" })
    expect(publishingOf(steps).negativeCacheTtlSeconds).toBeNull()
  })

  test("falls back to the second resolver when the first will not answer", async () => {
    const steps = await collect(
      readZone({
        resolvers: [unreachableResolver("dead", "SERVFAIL"), fakeResolver(FIXTURES)],
      })({ name: "acme.com" }),
    )

    expect(delegationOf(steps).zone.provider).toBe("cloudflare")
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
    const steps = await collect(
      readZone({
        zones: inMemoryZoneRepository([["acme.com", stale]]),
        resolvers: [explode],
      })({ name: "acme.com" }),
    )

    expect(steps.map((step) => step.type)).toEqual(["delegated", "published"])
    expect(delegationOf(steps).fromCache).toBe(true)
    expect(delegationOf(steps).zone.nameservers).toEqual(["ns1.old.com"])
  })

  test("asks DNS again once the reading is older than the TTL", async () => {
    const steps = await collect(
      readZone({
        zones: inMemoryZoneRepository([["acme.com", stale]]),
        cacheTtlSeconds: 60,
      })({ name: "acme.com" }),
    )

    expect(delegationOf(steps).fromCache).toBe(false)
    expect(delegationOf(steps).zone.nameservers).toEqual([
      "ns1.cloudflare.com",
      "ns2.cloudflare.com",
    ])
  })

  test("saves the zone only once the SOA has landed", async () => {
    const zones = inMemoryZoneRepository()
    const generator = readZone({ zones })({ name: "acme.com" })

    await generator.next()
    expect(await zones.findByRequestedName("acme.com")).toBeNull()

    await generator.next()
    expect((await zones.findByRequestedName("acme.com"))?.soa).not.toBeNull()
  })

  test("keys the cache on the name that was asked for, not the zone that answered", async () => {
    const zones = inMemoryZoneRepository()
    await collect(readZone({ zones })({ name: "app.staging.acme.com" }))

    expect(await zones.findByRequestedName("app.staging.acme.com")).not.toBeNull()
  })
})
