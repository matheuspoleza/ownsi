import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../../src/domains/api/domain.response.ts"
import type {
  ProofLinkListResponse,
  ProofLinkResponse,
} from "../../src/proof/api/proof-link.response.ts"
import { daysAfter, secondsAfter } from "../../src/shared/time.ts"
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
    expect(link).not.toHaveProperty("expiresAt")
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

  test("asking twice hands back the same slug", async () => {
    const { app, claim } = await proved()
    const first = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const second = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    expect(second.slug).toBe(first.slug)
    expect(app.proofLinks.all()).toHaveLength(1)
  })

  test("a year later it is still the same slug: nothing about it runs down", async () => {
    const { app, claim } = await proved()
    const first = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    app.at(daysAfter(NOW, 365))
    const second = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    expect(second.slug).toBe(first.slug)
    expect(app.proofLinks.all()).toHaveLength(1)
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
  test("are listed newest first, revoked ones included", async () => {
    const { app, claim } = await proved()
    const first = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    await app.post(`/api/claims/${claim.id}/proof_links/${first.slug}/revoke`)

    app.at(secondsAfter(NOW, 60))
    const second = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const { links } = await bodyOf<LinkListBody>(
      await app.get(`/api/claims/${claim.id}/proof_links`),
    )
    expect(links.map((link) => link.slug)).toEqual([second.slug, first.slug])
    expect(links.map((link) => link.standing)).toEqual(["live", "revoked"])
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
    const stranger = harness({ now: NOW, records: app.records })

    expect((await stranger.get(`/p/${link.slug}`)).status).toBe(200)
  })

  test("a slug nobody published is a 404 that reveals nothing", async () => {
    const { app } = await proved()
    const response = await app.get("/p/nothere")

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain("acme.com")
  })

  test("a revoked link is gone the same way", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    await app.post(`/api/claims/${claim.id}/proof_links/${link.slug}/revoke`)

    const response = await app.get(`/p/${link.slug}`)
    const page = await response.text()

    expect(response.status).toBe(410)
    expect(page).toContain("taken back")
    expect(page).not.toContain("acme.com")
  })

  test("says nothing later has been proved, without naming who else holds one", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(page).toContain("Most recent proof")
    expect(page).toContain("Nothing later has been proved for acme.com.")
  })

  test("a later proof of the same name is named by its date and nothing else", async () => {
    const later = new Date("2026-09-03T11:00:00Z")
    const app = harness({ now: NOW, answers: () => FOUND, latestProof: later })
    const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const page = await (await app.get(`/p/${link.slug}`)).text()

    expect(page).toContain("Later proof on record")
    expect(page).toContain("A later proof of acme.com was made on Sep 03, 2026.")
    expect(page).toContain("Aug 24, 2026")
    expect(page).not.toContain("g•••")
  })

  test("the badge is an SVG a README can embed, and it dates the proof", async () => {
    const { app, claim } = await proved()
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    const response = await app.get(`/p/${link.slug}/badge.svg`)

    expect(response.headers.get("content-type")).toStartWith("image/svg+xml")
    const svg = await response.text()
    expect(svg).toContain("proved Aug 24, 2026")
    expect(svg).toContain("#0f5c36")
  })

  test("the badge names a newer proof in the palette's info blue, never a warning", async () => {
    const later = new Date("2026-09-03T11:00:00Z")
    const app = harness({ now: NOW, answers: () => FOUND, latestProof: later })
    const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    const link = await bodyOf<LinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const svg = await (await app.get(`/p/${link.slug}/badge.svg`)).text()

    expect(svg).toContain("proved Aug 24, 2026 · newer Sep 03, 2026")
    expect(svg).toContain("#1d4ed8")
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
    const stranger = harness({ now: NOW, session: signedOut, records: app.records })

    expect((await stranger.get(`/p/${link.slug}`)).status).toBe(200)
  })
})
