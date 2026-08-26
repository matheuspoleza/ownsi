import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../../src/domains/api/domain.response.ts"
import { bodyOf, harness, signedOut } from "../harness.ts"

type ClaimBody = Static<typeof ClaimDetailResponse>
type DomainBody = Static<typeof DomainResponse>

const decode = (chunk: unknown): string =>
  typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk as Uint8Array)

describe("the stream an account watches", () => {
  test("it needs a session", async () => {
    const app = harness({ session: signedOut })

    expect((await app.get("/api/events")).status).toBe(401)
  })

  test("a claim ending is announced on it, naming what to read back", async () => {
    const app = harness()
    const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

    const response = await app.get("/api/events")
    expect(response.headers.get("content-type")).toContain("text/event-stream")

    const reader = response.body?.getReader()
    if (reader === undefined) throw new Error("the stream carried no body")

    const opening = await reader.read()
    expect(decode(opening.value)).toContain('"type":"heartbeat"')

    const next = reader.read()
    await app.post(`/api/claims/${claim.id}/cancel`)

    const announced = decode((await next).value)
    expect(announced).toContain('"type":"claim.ended"')
    expect(announced).toContain(claim.id)
    expect(announced).toContain(domain.id)

    await reader.cancel()
  })
})
