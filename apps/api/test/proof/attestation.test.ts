import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../../src/domains/api/domain.response.ts"
import type { ProofResponse } from "../../src/proof/api/attestation.response.ts"
import type { ProofLinkResponse } from "../../src/proof/api/proof-link.response.ts"
import { daysAfter } from "../../src/shared/time.ts"
import type { AttemptOutcome } from "../../src/verification/verification.contract.ts"
import { bodyOf, type ErrorBody, harness } from "../harness.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const FOUND: AttemptOutcome = { type: "found", value: "ownsi_v1_token_1" }

type ClaimBody = Static<typeof ClaimDetailResponse>
type DomainBody = Static<typeof DomainResponse>
type LinkBody = Static<typeof ProofLinkResponse>
type ProofBody = Static<typeof ProofResponse>

async function shared(name = "acme.com") {
  const app = harness({ now: NOW, answers: () => FOUND })
  const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))
  const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
  await app.post(`/api/verifications/${claim.verificationId}/runs`)
  const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

  return { app, claim, link }
}

describe("reading a proof from another program", () => {
  test("states the same attestation the page does, and reads no DNS", async () => {
    const { app, link } = await shared()

    const asked = app.asked.length
    const response = await app.get(`/api/proofs/${link.slug}`)

    expect(response.status).toBe(200)
    expect(await bodyOf<ProofBody>(response)).toEqual({
      slug: link.slug,
      url: `https://ownsi.dev/p/${link.slug}`,
      domain: "acme.com",
      unicodeDomain: "acme.com",
      heldBy: "a•••@example.com",
      token: link.token,
      challengeHost: "_ownsi-challenge.acme.com",
      provider: "Cloudflare",
      provedAt: NOW.toISOString(),
      recency: { type: "latest" },
    })
    expect(app.asked).toHaveLength(asked)
  })

  test("names a later proof of the same name, and retracts nothing about this one", async () => {
    const later = new Date("2026-09-03T11:00:00Z")
    const app = harness({ now: NOW, answers: () => FOUND, latestProof: later })
    const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const proof = await bodyOf<ProofBody>(await app.get(`/api/proofs/${link.slug}`))

    expect(proof.recency).toEqual({ type: "earlier", latestProvedAt: later.toISOString() })
    expect(proof.provedAt).toBe(NOW.toISOString())
  })

  test("carries none of the holder's bookkeeping", async () => {
    const { app, link } = await shared()
    const proof = await bodyOf<Record<string, unknown>>(await app.get(`/api/proofs/${link.slug}`))

    expect(Object.keys(proof)).not.toContain("claimId")
    expect(Object.keys(proof)).not.toContain("expiresAt")
    expect(Object.keys(proof)).not.toContain("standing")
  })

  test("may be held for five minutes, because the attestation never changes", async () => {
    const { app, link } = await shared()
    const response = await app.get(`/api/proofs/${link.slug}`)

    expect(response.headers.get("cache-control")).toBe("public, max-age=300")
  })

  test("needs no account: the holder's session is nothing to do with it", async () => {
    const { app, link } = await shared()
    const stranger = harness({ now: NOW, records: app.records })

    expect((await stranger.get(`/api/proofs/${link.slug}`)).status).toBe(200)
  })

  test("a slug nobody published is a 404 that reveals nothing", async () => {
    const { app } = await shared()
    const response = await app.get("/api/proofs/nothere")

    expect(response.status).toBe(404)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("proof_not_found")
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  test("a year later it still resolves: nothing but its holder can stop it", async () => {
    const { app, link } = await shared()

    app.at(daysAfter(NOW, 365))
    expect((await app.get(`/api/proofs/${link.slug}`)).status).toBe(200)
  })

  test("a revoked link is gone, and the proof it shared keeps its date", async () => {
    const { app, claim, link } = await shared()
    await app.post(`/api/claims/${claim.id}/proof_links/${link.slug}/revoke`)

    const response = await app.get(`/api/proofs/${link.slug}`)

    expect(response.status).toBe(410)
    const body = await bodyOf<ErrorBody & { error: { message: string } }>(response)
    expect(body.error.code).toBe("proof_revoked")
    expect(body.error.message).toContain("stands")

    const still = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(still.endedAt).toBe(NOW.toISOString())
  })
})
