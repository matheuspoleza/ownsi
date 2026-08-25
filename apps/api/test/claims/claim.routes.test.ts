import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse, ClaimListResponse } from "../../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../../src/domains/api/domain.response.ts"
import { bodyOf, type ErrorBody, GRACE, harness, signedInAs, signedOut } from "../harness.ts"

type ClaimBody = Static<typeof ClaimDetailResponse>
type ClaimListBody = Static<typeof ClaimListResponse>
type DomainBody = Static<typeof DomainResponse>

async function onADomain(name = "acme.com") {
  const app = harness()
  const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))

  return { app, domain }
}

describe("opening a claim", () => {
  test("answers 201 with the token, the record and the verification", async () => {
    const { app, domain } = await onADomain()
    const response = await app.post("/api/claims", { domainId: domain.id })

    expect(response.status).toBe(201)
    const claim = await bodyOf<ClaimBody>(response)
    expect(claim).toMatchObject({ domainId: domain.id, domain: "acme.com", state: "pending" })
    expect(claim.token).toStartWith("ownsi_v1_")
    expect(claim.verificationId).not.toBeNull()
  })

  test("a second claim while one is open is a conflict, not a new token", async () => {
    const { app, domain } = await onADomain()
    await app.post("/api/claims", { domainId: domain.id })

    const response = await app.post("/api/claims", { domainId: domain.id })
    expect(response.status).toBe(409)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("already_claimed")
  })

  test("a domain that is not on this account cannot be claimed", async () => {
    const { domain } = await onADomain()
    const theirs = harness({ session: signedInAs(GRACE) })

    const response = await theirs.post("/api/claims", { domainId: domain.id })
    expect(response.status).toBe(404)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("domain_not_found")
  })
})

describe("reading claims back", () => {
  test("the list is the account's history, narrowable to one domain", async () => {
    const { app, domain } = await onADomain()
    const other = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "other.com" }))
    const first = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
    await app.post("/api/claims", { domainId: other.id })
    await app.post(`/api/claims/${first.id}/cancel`)
    const second = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

    const all = await bodyOf<ClaimListBody>(await app.get("/api/claims"))
    expect(all.claims).toHaveLength(3)

    const narrowed = await bodyOf<ClaimListBody>(await app.get(`/api/claims?domainId=${domain.id}`))
    expect(narrowed.claims.map((claim) => claim.id).sort()).toEqual([first.id, second.id].sort())
  })

  test("an ended claim keeps its token and stops asking for a record", async () => {
    const { app, domain } = await onADomain()
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
    await app.post(`/api/claims/${claim.id}/cancel`)

    const ended = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(ended).toMatchObject({ state: "canceled", token: claim.token, records: [] })
    expect(ended.endedAt).not.toBeNull()
  })

  test("another account's claim reads as missing", async () => {
    const { app, domain } = await onADomain()
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

    const theirs = harness({ session: signedInAs(GRACE) })
    expect((await theirs.get(`/api/claims/${claim.id}`)).status).toBe(404)
  })

  test("a claim nobody opened is 404", async () => {
    const app = harness()

    expect((await app.get("/api/claims/clm_nothing")).status).toBe(404)
    expect((await bodyOf<ErrorBody>(await app.get("/api/claims/clm_nothing"))).error.code).toBe(
      "claim_not_found",
    )
  })
})

describe("the session", () => {
  test("every claim route needs one", async () => {
    const app = harness({ session: signedOut })

    for (const response of [
      await app.get("/api/claims"),
      await app.post("/api/claims", { domainId: "dom_1" }),
      await app.get("/api/claims/clm_1"),
      await app.post("/api/claims/clm_1/cancel"),
    ]) {
      expect(response.status).toBe(401)
    }
  })

  test("every verification route needs one", async () => {
    const app = harness({ session: signedOut })

    for (const response of [
      await app.get("/api/verifications/vrf_1"),
      await app.get("/api/verifications/vrf_1/attempts"),
      await app.post("/api/verifications/vrf_1/runs"),
    ]) {
      expect(response.status).toBe(401)
    }
  })
})
