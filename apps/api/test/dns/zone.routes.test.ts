import { describe, expect, test } from "bun:test"
import { createApp } from "../../src/app.ts"
import type { AppConfig } from "../../src/config.ts"
import {
  type DnsFixtures,
  fakeNameserver,
  fakeResolver,
  unreachableResolver,
} from "../../src/dns/infra/fake-resolver.ts"
import { inMemoryZoneRepository } from "../../src/dns/infra/zone-repository.ts"
import { fixedClock } from "../../src/shared/clock.ts"
import type { Database } from "../../src/shared/database.ts"

const CONFIG: AppConfig = {
  port: 0,
  appUrl: "http://localhost:5173",
  databaseUrl: "postgresql://unused",
  dns: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    zoneCacheTtlSeconds: 300,
    soaBudgetMs: 2_500,
  },
}

const FIXTURES: DnsFixtures = {
  "acme.com|NS": {
    records: [{ name: "acme.com", type: "NS", ttl: 3600, data: "ns1.cloudflare.com" }],
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

const unusedDatabase = {} as Database

function server(resolvers = [fakeResolver(FIXTURES)]) {
  return createApp(CONFIG, {
    database: unusedDatabase,
    clock: fixedClock(new Date("2026-08-24T12:00:00Z")),
    dns: {
      resolvers,
      askNameserver: fakeNameserver(FIXTURES),
      zones: inMemoryZoneRepository(),
    },
  })
}

async function errorOf(response: Response) {
  const body = (await response.json()) as { error: { code: string } }
  return body.error
}

function get(app: ReturnType<typeof server>, path: string) {
  return app.handle(new Request(`http://localhost${path}`))
}

describe("GET /api/zones/:name", () => {
  test("answers the reading the landing screen needs", async () => {
    const response = await get(server(), "/api/zones/acme.com")
    expect(response.status).toBe(200)

    expect(await response.json()).toEqual({
      name: "acme.com",
      domain: {
        ascii: "acme.com",
        unicode: "acme.com",
        normalisations: [],
        isPublicSuffix: false,
      },
      nameservers: ["ns1.cloudflare.com"],
      provider: "cloudflare",
      publishingMinutes: 5,
      negativeCacheTtlSeconds: 300,
      observedAt: "2026-08-24T12:00:00.000Z",
      cached: false,
    })
  })

  test("returns 400 for something that is not a domain", async () => {
    const response = await get(server(), "/api/zones/not%20a%20domain")
    expect(response.status).toBe(400)
    expect((await errorOf(response)).code).toBe("invalid_domain")
  })

  test("returns 404 when the name has no delegation", async () => {
    const response = await get(server(), "/api/zones/nothing-here.com")
    expect(response.status).toBe(404)
    expect((await errorOf(response)).code).toBe("no_delegation")
  })

  test("returns 502, not 404, when DNS could not be reached", async () => {
    const response = await get(server([unreachableResolver("dead")]), "/api/zones/acme.com")
    expect(response.status).toBe(502)
    expect((await errorOf(response)).code).toBe("unresolvable")
  })

  test("serves the second reading from the cache", async () => {
    const app = server()
    await get(app, "/api/zones/acme.com")

    const response = await get(app, "/api/zones/acme.com")
    expect(((await response.json()) as { cached: boolean }).cached).toBe(true)
  })
})
