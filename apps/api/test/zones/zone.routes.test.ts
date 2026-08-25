import { describe, expect, test } from "bun:test"
import { createApp } from "../../src/app.ts"
import type { AppConfig } from "../../src/config.ts"
import { fixedClock } from "../../src/shared/clock.ts"
import type { Database } from "../../src/shared/database.ts"
import {
  type DnsFixtures,
  fakeNameserver,
  fakeResolver,
  unreachableResolver,
} from "../../src/zones/infra/fake-resolver.ts"
import { inMemoryZoneRepository } from "../../src/zones/infra/zone-repository.ts"

const CONFIG: AppConfig = {
  port: 0,
  appUrl: "http://localhost:5173",
  databaseUrl: "postgresql://unused",
  auth: {
    secret: "zone-routes-test-secret",
    baseUrl: "http://localhost:5173",
    basePath: "/api/auth",
    magicLinkTtlSeconds: 600,
    google: null,
  },
  mailer: { driver: "log", apiKey: "", from: "ownsi <no-reply@ownsi.dev>" },
  zones: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    zoneCacheTtlSeconds: 300,
    soaBudgetMs: 2_500,
  },
  domains: { driver: "demo" },
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
    zones: {
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

type WireStep = { event: string; data: Record<string, unknown> }

async function stepsOf(response: Response): Promise<WireStep[]> {
  const reader = (response.body as ReadableStream<string | Uint8Array>).getReader()
  const frames: string[] = []

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    frames.push(typeof value === "string" ? value : new TextDecoder().decode(value))
  }

  return frames
    .join("")
    .split("\n\n")
    .filter((frame) => frame.trim())
    .map((frame) => {
      const event = /^event: (.+)$/m.exec(frame)?.[1] ?? ""
      const data = /^data: (.+)$/m.exec(frame)?.[1] ?? "{}"
      return { event, data: JSON.parse(data) as Record<string, unknown> }
    })
}

function get(app: ReturnType<typeof server>, path: string) {
  return app.handle(new Request(`http://localhost${path}`))
}

describe("GET /api/zones/:name", () => {
  test("streams the delegation first, then the publishing estimate", async () => {
    const response = await get(server(), "/api/zones/acme.com")
    expect(response.status).toBe(200)

    expect(response.headers.get("content-type")).toContain("text/event-stream")
    expect(await stepsOf(response)).toEqual([
      {
        event: "delegation",
        data: {
          step: "delegation",
          name: "acme.com",
          domain: {
            ascii: "acme.com",
            unicode: "acme.com",
            normalisations: [],
            isPublicSuffix: false,
          },
          nameservers: ["ns1.cloudflare.com"],
          provider: "cloudflare",
          observedAt: "2026-08-24T12:00:00.000Z",
          cached: false,
        },
      },
      {
        event: "publishing",
        data: { step: "publishing", publishingMinutes: 5, negativeCacheTtlSeconds: 300 },
      },
    ])
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

  test("keeps a failure a status, never a step in an already-open stream", async () => {
    const response = await get(server([unreachableResolver("dead")]), "/api/zones/acme.com")
    expect(response.headers.get("content-type")).toContain("application/json")
    expect(await response.json()).toHaveProperty("error")
  })

  test("serves the second reading from the cache", async () => {
    const app = server()
    await stepsOf(await get(app, "/api/zones/acme.com"))

    const [delegation] = await stepsOf(await get(app, "/api/zones/acme.com"))
    expect(delegation?.data.cached).toBe(true)
  })
})
