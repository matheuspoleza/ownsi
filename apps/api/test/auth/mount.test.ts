import { describe, expect, test } from "bun:test"
import { createApp } from "../../src/app.ts"
import type { AppConfig } from "../../src/config.ts"
import type { Database } from "../../src/shared/database.ts"

const CONFIG: AppConfig = {
  port: 0,
  appUrl: "http://localhost:5173",
  databaseUrl: "postgresql://unused",
  auth: {
    secret: "auth-mount-test-secret-long-enough",
    baseUrl: "http://localhost:5173",
    basePath: "/api/auth",
    magicLinkTtlSeconds: 600,
    google: null,
  },
  mailer: { driver: "log", apiKey: "", from: "ownsi <no-reply@ownsi.dev>" },
  inngest: {
    driver: "manual",
    id: "ownsi",
    isDev: true,
    baseUrl: null,
    eventKey: "",
    signingKey: "",
  },
  zones: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    zoneCacheTtlSeconds: 300,
    soaBudgetMs: 2_500,
  },
  verification: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    authoritativeBudgetMs: 2_500,
  },
  domains: { driver: "demo", appUrl: "https://ownsi.dev" },
}

const app = () => createApp(CONFIG, { database: {} as Database })

describe("better-auth stays mounted where the front end expects it", () => {
  test("answers under the base path", async () => {
    const response = await app().handle(new Request("http://localhost/api/auth/ok"))

    expect(response.status).toBe(200)
  })

  test("is not in the OpenAPI document — the front end reaches it with its own client", async () => {
    const response = await app().handle(new Request("http://localhost/openapi/json"))
    const spec = (await response.json()) as { paths: Record<string, unknown> }

    expect(Object.keys(spec.paths).filter((path) => path.startsWith("/api/auth"))).toEqual([])
  })

  test("the public zone read is still reachable without a session", async () => {
    const response = await app().handle(new Request("http://localhost/api/zones/acme.com"))

    expect(response.status).not.toBe(401)
  })
})
