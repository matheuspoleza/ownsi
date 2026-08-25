import { afterEach, describe, expect, test } from "bun:test"
import { dohResolver } from "../../src/zones/infra/doh-resolver.service.ts"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function respondWith(body: unknown, init: ResponseInit = {}) {
  globalThis.fetch = (async () => Response.json(body, init)) as unknown as typeof fetch
}

describe("dohResolver", () => {
  test("reads records and names who answered", async () => {
    respondWith({
      Status: 0,
      Answer: [{ name: "acme.com.", type: 2, TTL: 86400, data: "ns1.cloudflare.com." }],
    })

    const answer = await dohResolver("cloudflare").query("acme.com", "NS")
    expect(answer.type).toBe("answered")
    if (answer.type !== "answered") return
    expect(answer.status).toBe("NOERROR")
    expect(answer.records).toEqual([
      { name: "acme.com", type: "NS", ttl: 86400, data: "ns1.cloudflare.com" },
    ])
    expect(answer.resolver).toBe("cloudflare")
  })

  test("unquotes a TXT value", async () => {
    respondWith({
      Status: 0,
      Answer: [{ name: "_ownsi-challenge.acme.com.", type: 16, TTL: 60, data: '"ownsi_v1_9f3a"' }],
    })

    const answer = await dohResolver("google").query("_ownsi-challenge.acme.com", "TXT")
    expect(answer.type === "answered" && answer.records[0]?.data).toBe("ownsi_v1_9f3a")
  })

  test("joins the chunks of a long TXT back together", async () => {
    respondWith({
      Status: 0,
      Answer: [{ name: "acme.com.", type: 16, TTL: 60, data: '"first-half" "second-half"' }],
    })

    const answer = await dohResolver("google").query("acme.com", "TXT")
    expect(answer.type === "answered" && answer.records[0]?.data).toBe("first-halfsecond-half")
  })

  test("keeps the SOA out of the authority section of a negative answer", async () => {
    respondWith({
      Status: 3,
      Authority: [{ name: "acme.com.", type: 6, data: "ns1.acme.com. h.acme.com. 1 2 3 4 300" }],
    })

    const answer = await dohResolver("quad9").query("_ownsi-challenge.acme.com", "TXT")
    expect(answer.type).toBe("answered")
    if (answer.type !== "answered") return
    expect(answer.status).toBe("NXDOMAIN")
    expect(answer.authoritySoa?.negativeCacheTtlSeconds).toBe(300)
  })

  test.each([
    [2, "SERVFAIL"],
    [5, "REFUSED"],
  ] as const)("reports rcode %p as our own failure, not a zone statement", async (code, reason) => {
    respondWith({ Status: code })
    const answer = await dohResolver("google").query("acme.com", "NS")
    expect(answer).toMatchObject({ type: "failed", reason })
  })

  test("reports a 5xx from the resolver as our own network error", async () => {
    respondWith({}, { status: 502 })
    const answer = await dohResolver("google").query("acme.com", "NS")
    expect(answer).toMatchObject({ type: "failed", reason: "NETWORK_ERROR" })
  })

  test("reports a thrown fetch as our own network error", async () => {
    globalThis.fetch = (async () => {
      throw new Error("connection refused")
    }) as unknown as typeof fetch

    const answer = await dohResolver("google").query("acme.com", "NS")
    expect(answer).toMatchObject({ type: "failed", reason: "NETWORK_ERROR" })
  })
})
