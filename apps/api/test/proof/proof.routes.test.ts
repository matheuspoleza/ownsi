import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../../src/domains/api/domain.response.ts"
import type {
  ProofLinkListResponse,
  ProofLinkResponse,
} from "../../src/proof/api/proof-link.response.ts"
import { PROOF_LINK_DAYS } from "../../src/proof/domain/proof-link.ts"
import { daysAfter } from "../../src/shared/time.ts"
import type { AttemptOutcome } from "../../src/verification/verification.contract.ts"
import { ADA, bodyOf, type ErrorBody, GRACE, harness, signedInAs, signedOut } from "../harness.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const FOUND: AttemptOutcome = { type: "found", value: "ownsi_v1_token_1" }

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

type ClaimBody = Static<typeof ClaimDetailResponse>
type DomainBody = Static<typeof DomainResponse>
type LinkBody = Static<typeof ProofLinkResponse>
type LinkListBody = Static<typeof ProofLinkListResponse>

async function claimed(answers: () => AttemptOutcome, name = "acme.com") {
  const app = harness({ now: NOW, answers })
  const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))
  const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

  return { app, domain, claim }
}

async function proved(name = "acme.com") {
  const { app, domain, claim } = await claimed(() => FOUND, name)
  await app.post(`/api/verifications/${claim.verificationId}/runs`)

  return { app, domain, claim }
}

describe("publishing a link to a proof", () => {
  test("answers 201 with a slug of its own, never the DNS token", async () => {
    const { app, claim } = await proved()
    const response = await app.post(`/api/claims/${claim.id}/proof_links`)

    expect(response.status).toBe(201)
    const link = await bodyOf<LinkBody>(response)
    expect(link.slug).not.toBe(claim.token)
    expect(link.url).toBe(`https://ownsi.dev/p/${link.slug}`)
    expect(link.standing).toBe("live")
    expect(link.expiresAt).toBe(daysAfter(NOW, PROOF_LINK_DAYS).toISOString())
  })

  test("states the moment it shares, masking the account behind it", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    expect(link).toMatchObject({
      domain: "acme.com",
      heldBy: "a•••@example.com",
      token: claim.token,
      provedAt: NOW.toISOString(),
    })
  })

  test("asking twice while one is live hands back the same slug", async () => {
    const { app, claim } = await proved()
    const first = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const second = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    expect(second.slug).toBe(first.slug)
    expect(app.proofLinks.all()).toHaveLength(1)
  })

  test("a link that has expired is replaced rather than reused", async () => {
    const { app, claim } = await proved()
    const first = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    app.at(daysAfter(NOW, PROOF_LINK_DAYS + 1))
    const second = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    expect(second.slug).not.toBe(first.slug)
    expect(app.proofLinks.all()).toHaveLength(2)
  })

  test("a claim that was never proved has nothing to share", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)
    const response = await app.post(`/api/claims/${claim.id}/proof_links`)

    expect(response.status).toBe(404)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("claim_not_proved")
  })

  test("another account's proof is not this account's to publish", async () => {
    const { claim } = await proved()
    const theirs = harness({ now: NOW, session: signedInAs(GRACE) })

    expect((await theirs.post(`/api/claims/${claim.id}/proof_links`)).status).toBe(404)
  })
})

describe("the links already out", () => {
  test("are listed newest first, expired and revoked included", async () => {
    const { app, claim } = await proved()
    const first = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    app.at(daysAfter(NOW, PROOF_LINK_DAYS + 1))
    const second = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const { links } = await bodyOf<LinkListBody>(
      await app.get(`/api/claims/${claim.id}/proof_links`),
    )
    expect(links.map((link) => link.slug)).toEqual([second.slug, first.slug])
    expect(links.map((link) => link.standing)).toEqual(["live", "expired"])
  })

  test("revoking one stops it and leaves the proof and the other links alone", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const taken = await bodyOf<LinkBody>(
      await app.post(`/api/claims/${claim.id}/proof_links/${link.slug}/revoke`),
    )
    expect(taken.standing).toBe("revoked")
    expect(taken.revokedAt).toBe(NOW.toISOString())

    const still = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(still.state).toBe("proved")
    expect(still.endedAt).toBe(NOW.toISOString())
  })

  test("a slug that was never published on that claim is not there to revoke", async () => {
    const { app, claim } = await proved()
    const response = await app.post(`/api/claims/${claim.id}/proof_links/nothere/revoke`)

    expect(response.status).toBe(404)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("proof_link_not_found")
  })
})

describe("the page a stranger opens", () => {
  test("states the domain, the date and the holder, and reads no DNS", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const asked = app.asked.length
    const response = await app.get(`/p/${link.slug}`)
    const page = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toStartWith("text/html")
    expect(page).toContain("acme.com")
    expect(page).toContain("Aug 24, 2026")
    expect(page).toContain("a•••@example.com")
    expect(app.asked).toHaveLength(asked)
  })

  test("names the provider that served the zone when the link went out", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(link.provider).toBe("Cloudflare")
    expect(page).toContain("Cloudflare")
  })

  test("hands the reader the lookup, so nobody has to take our word for it", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(link.challengeHost).toBe("_ownsi-challenge.acme.com")
    expect(page).toContain("dig TXT _ownsi-challenge.acme.com +short")
  })

  test("commits to one palette: a black ticket needs a page that stays light", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(page).not.toContain("prefers-color-scheme")
    expect(page).not.toContain("color-scheme")
  })

  test("carries the tags a link preview reads", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(page).toContain('<meta property="og:title" content="acme.com — proved on Aug 24, 2026">')
    expect(page).toContain(`<meta property="og:url" content="https://ownsi.dev/p/${link.slug}">`)
  })

  test("needs no account: the holder's session is nothing to do with it", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const stranger = harness({ now: NOW, overrides: { proof: { links: app.proofLinks } } })

    expect((await stranger.get(`/p/${link.slug}`)).status).toBe(200)
  })

  test("a slug nobody published is a 404 that reveals nothing", async () => {
    const { app } = await proved()
    const response = await app.get("/p/nothere")

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain("acme.com")
  })

  test("an expired link is gone, and says the proof behind it is not", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    app.at(daysAfter(NOW, PROOF_LINK_DAYS))
    const response = await app.get(`/p/${link.slug}`)
    const page = await response.text()

    expect(response.status).toBe(410)
    expect(page).toContain("still true and still dated")
    expect(page).not.toContain("acme.com")
  })

  test("a revoked link is gone the same way", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    await app.post(`/api/claims/${claim.id}/proof_links/${link.slug}/revoke`)

    const response = await app.get(`/p/${link.slug}`)
    expect(response.status).toBe(410)
    expect(await response.text()).toContain("taken back")
  })

  test("the badge is an SVG a README can embed, and it dates the proof", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const response = await app.get(`/p/${link.slug}/badge.svg`)

    expect(response.headers.get("content-type")).toStartWith("image/svg+xml")
    expect(await response.text()).toContain("proved Aug 24, 2026")
  })

  test("nothing about the account leaks into a page a stranger holds", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(page).not.toContain(ADA.email)
    expect(page).not.toContain(ADA.id)
  })
})

describe("the session", () => {
  test("publishing, listing and revoking a link all need one", async () => {
    const app = harness({ now: NOW, session: signedOut })

    for (const response of [
      await app.post("/api/claims/clm_1/proof_links"),
      await app.get("/api/claims/clm_1/proof_links"),
      await app.post("/api/claims/clm_1/proof_links/slug1/revoke"),
    ]) {
      expect(response.status).toBe(401)
    }
  })

  test("the page itself needs none — it is what a stranger opens", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const stranger = harness({
      now: NOW,
      session: signedOut,
      overrides: { proof: { links: app.proofLinks } },
    })

    expect((await stranger.get(`/p/${link.slug}`)).status).toBe(200)
  })
})
