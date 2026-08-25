import { describe, expect, test } from "bun:test"
import { createOwnsi, isOwnsiError, type OwnsiError } from "../src/index.ts"
import { CLAIM, DOMAIN, errorBody, fakeApi, RECORD, VERIFICATION } from "./fake-api.ts"

function client() {
  const api = fakeApi()
  const ownsi = createOwnsi({ baseUrl: "http://localhost", fetch: api.fetch })

  return { ownsi, api }
}

const thrown = async (act: () => Promise<unknown>): Promise<OwnsiError> => {
  try {
    await act()
  } catch (error) {
    if (isOwnsiError(error)) return error
    throw error
  }
  throw new Error("nothing was thrown")
}

describe("one sentence, three calls underneath", () => {
  test("a name becomes a domain, and asking twice is the same call", async () => {
    const { ownsi, api } = client()
    api.answer("POST /api/domains", { status: 201, body: DOMAIN })

    const domain = await ownsi.domains.findOrCreate("acme.com")

    expect(domain.id).toBe("dom_1")
    expect(domain.name).toBe("acme.com")
    expect(api.calls).toEqual([
      { method: "POST", path: "/api/domains", body: { domain: "acme.com" } },
    ])
  })

  test("the domain opens its own claim, and the claim carries the record to write", async () => {
    const { ownsi, api } = client()
    api.answer("POST /api/domains", { status: 201, body: DOMAIN })
    api.answer("POST /api/claims", { status: 201, body: CLAIM })

    const domain = await ownsi.domains.findOrCreate("acme.com")
    const claim = await domain.claim()

    expect(claim.record).toEqual(RECORD)
    expect(claim.token).toBe("ownsi_v1_token")
    expect(api.calls[1]).toEqual({
      method: "POST",
      path: "/api/claims",
      body: { domainId: "dom_1" },
    })
  })

  test("an ended claim asks for no record", async () => {
    const { ownsi, api } = client()
    api.answer("GET /api/claims/clm_1", {
      body: { ...CLAIM, state: "canceled", records: [], endedAt: "2026-08-25T12:00:00.000Z" },
    })

    expect((await ownsi.claims.get("clm_1")).record).toBeNull()
  })

  test("the claim reaches its own verification without the caller holding an id", async () => {
    const { ownsi, api } = client()
    api.answer("GET /api/claims/clm_1", { body: CLAIM })
    api.answer("GET /api/verifications/vrf_1", { body: VERIFICATION })

    const verification = await (await ownsi.claims.get("clm_1")).verification()

    expect(verification.status).toBe("checking")
    expect(verification.waitEstimate).toEqual({ reason: "first_check", secondsRemaining: 30 })
  })

  test("a recheck runs the verification, not the claim", async () => {
    const { ownsi, api } = client()
    api.answer("GET /api/claims/clm_1", { body: CLAIM })
    api.answer("POST /api/verifications/vrf_1/runs", {
      body: { ...VERIFICATION, status: "needs_attention" },
    })

    const ran = await (await ownsi.claims.get("clm_1")).recheck()

    expect(ran.status).toBe("needs_attention")
    expect(api.calls.at(-1)?.path).toBe("/api/verifications/vrf_1/runs")
  })

  test("a claim whose handoff failed says so instead of building a broken URL", async () => {
    const { ownsi, api } = client()
    api.answer("GET /api/claims/clm_1", { body: { ...CLAIM, verificationId: null } })

    const claim = await ownsi.claims.get("clm_1")
    const error = await thrown(() => claim.verification())

    expect(error.code).toBe("verification_not_found")
    expect(api.calls).toHaveLength(1)
  })

  test("listing a domain's claims narrows the query instead of filtering client-side", async () => {
    const { ownsi, api } = client()
    api.answer("GET /api/domains/dom_1", { body: DOMAIN })
    api.answer("GET /api/claims", { body: { claims: [CLAIM] } })

    const claims = await (await ownsi.domains.get("dom_1")).claims()

    expect(claims).toHaveLength(1)
    expect(api.calls.at(-1)?.path).toBe("/api/claims")
  })

  test("deleting a domain expects no body back", async () => {
    const { ownsi, api } = client()
    api.answer("GET /api/domains/dom_1", { body: DOMAIN })
    api.answer("DELETE /api/domains/dom_1", { status: 204 })

    await (await ownsi.domains.get("dom_1")).delete()

    expect(api.calls.at(-1)).toEqual({ method: "DELETE", path: "/api/domains/dom_1", body: null })
  })
})

describe("errors arrive as codes, not as strings to parse", () => {
  test("the API's own code and docsUrl come through untouched", async () => {
    const { ownsi, api } = client()
    api.answer("POST /api/claims", {
      status: 409,
      body: errorBody("already_claimed", "That domain already has a claim open on your account."),
    })

    const error = await thrown(() => ownsi.claims.create("dom_1"))

    expect(error.code).toBe("already_claimed")
    expect(error.docsUrl).toBe("https://ownsi.dev/docs/errors#already_claimed")
    expect(error.message).toContain("already has a claim open")
  })

  test("an answer that is not ours reads as unreachable, never as a domain's fault", async () => {
    const { ownsi, api } = client()
    api.answer("POST /api/claims", { status: 502, body: { message: "Bad gateway" } })

    expect((await thrown(() => ownsi.claims.create("dom_1"))).code).toBe("unreachable")
  })

  test("a 404 with no body is still a code a caller can branch on", async () => {
    const { ownsi } = client()

    expect((await thrown(() => ownsi.claims.get("clm_nothing"))).code).toBe("unreachable")
  })
})
