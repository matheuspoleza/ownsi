import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../src/domains/api/domain.response.ts"
import type { ProofLinkResponse } from "../src/proof/api/proof-link.response.ts"
import { daysAfter, secondsAfter } from "../src/shared/time.ts"
import type { VerificationResponse } from "../src/verification/api/verification.response.ts"
import type { AttemptOutcome } from "../src/verification/verification.contract.ts"
import { bodyOf, harness } from "./harness.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

const CACHED_ABSENCE: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "negative_cache", observed: { secondsRemaining: 240 } },
}

type ClaimBody = Static<typeof ClaimDetailResponse>
type DomainBody = Static<typeof DomainResponse>
type ProofLinkBody = Static<typeof ProofLinkResponse>
type VerificationBody = Static<typeof VerificationResponse>

async function claimed(answers: () => AttemptOutcome, name = "acme.com") {
  const app = harness({ now: NOW, answers })
  const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))
  const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
  const opening = app.notified.length
  const saidSince = () => app.notified.slice(opening).map((sent) => sent.notice.kind)

  return { app, domain, claim, saidSince }
}

describe("from a name to a proof", () => {
  test("claiming a domain hands back the record to write and the process behind it", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)

    expect(claim.state).toBe("pending")
    expect(claim.records).toEqual([
      {
        host: "_ownsi-challenge",
        name: "_ownsi-challenge.acme.com",
        type: "TXT",
        value: claim.token,
      },
    ])
    expect(claim.verificationId).not.toBeNull()
    expect(claim.expiresAt).toBe(daysAfter(NOW, 7).toISOString())
    expect(app.notified.map((sent) => sent.notice.kind)).toEqual(["opened"])
  })

  test("the verification is already waiting, thirty seconds out", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)
    const verification = await bodyOf<VerificationBody>(
      await app.get(`/api/verifications/${claim.verificationId}`),
    )

    expect(verification.claimId).toBe(claim.id)
    expect(verification.status).toBe("checking")
    expect(verification.nextRunAt).toBe(secondsAfter(NOW, 30).toISOString())
    expect(verification.waitEstimate).toEqual({ reason: "first_check", secondsRemaining: 30 })
  })

  test("the record appearing proves the verification and the claim with it", async () => {
    const { app, claim, saidSince } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    const ran = await bodyOf<VerificationBody>(
      await app.post(`/api/verifications/${claim.verificationId}/runs`),
    )

    expect(ran.status).toBe("proved")

    const proved = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(proved.state).toBe("proved")
    expect(proved.endedAt).toBe(NOW.toISOString())
    expect(saidSince()).toEqual(["proved"])
  })

  test("proving publishes a link a stranger can read, and the email carries it", async () => {
    const { app, claim, saidSince } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)

    expect(saidSince()).toEqual(["proved"])
    const [proved] = app.notified.filter((sent) => sent.notice.kind === "proved")
    const proofUrl = proved?.notice.kind === "proved" ? proved.notice.proofUrl : null
    expect(proofUrl).toMatch(/^https:\/\/ownsi\.dev\/p\//)

    const slug = proofUrl?.split("/p/")[1] ?? ""
    expect((await app.get(`/p/${slug}`)).status).toBe(200)
  })

  test("a record nobody published leaves the claim open and names the failure", async () => {
    const { app, claim, saidSince } = await claimed(() => NOT_PUBLISHED)
    const ran = await bodyOf<VerificationBody>(
      await app.post(`/api/verifications/${claim.verificationId}/runs`),
    )

    expect(ran.status).toBe("needs_attention")
    expect(ran.diagnosis?.code).toBe("not_published")

    const still = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(still.state).toBe("pending")
    expect(saidSince()).toEqual([])
  })

  test("resolvers nobody could reach say nothing and move nothing", async () => {
    const { app, claim, saidSince } = await claimed(() => ({
      type: "unresolvable",
      resolvers: ["quad9"],
    }))
    const ran = await bodyOf<VerificationBody>(
      await app.post(`/api/verifications/${claim.verificationId}/runs`),
    )

    expect(ran.status).toBe("checking")
    expect(ran.diagnosis).toBeNull()
    expect(saidSince()).toEqual([])
  })

  test("every run leaves evidence behind, and the proof rests on it", async () => {
    const { app, claim } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)

    const { attempts } = await bodyOf<{ attempts: readonly { outcome: string }[] }>(
      await app.get(`/api/verifications/${claim.verificationId}/attempts`),
    )

    expect(attempts.map((attempt) => attempt.outcome)).toEqual(["found"])
  })
})

describe("what ends a claim", () => {
  test("cancelling stops the process the claim started", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)
    await app.post(`/api/claims/${claim.id}/cancel`)

    const verification = await bodyOf<VerificationBody>(
      await app.get(`/api/verifications/${claim.verificationId}`),
    )

    expect(verification.status).toBe("stopped")
    expect(verification.nextRunAt).toBeNull()
  })

  test("an ended claim takes no further action", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)
    await app.post(`/api/claims/${claim.id}/cancel`)

    const again = await app.post(`/api/claims/${claim.id}/cancel`)
    expect(again.status).toBe(409)
  })

  test("archiving the domain ends the claim on it without being asked twice", async () => {
    const { app, domain, claim } = await claimed(() => NOT_PUBLISHED)
    await app.post(`/api/domains/${domain.id}/archive`)

    const ended = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(ended.state).toBe("canceled")
  })

  test("archiving a proved name takes every link it published off the internet", async () => {
    const { app, domain, claim } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    const link = await bodyOf<ProofLinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    expect((await app.get(`/p/${link.slug}`)).status).toBe(200)

    await app.post(`/api/domains/${domain.id}/archive`)

    expect((await app.get(`/p/${link.slug}`)).status).toBe(410)
    expect((await app.get(`/p/${link.slug}/badge.svg`)).status).toBe(410)
  })

  test("the proof itself is untouched, and the record of what was shared stays readable", async () => {
    const { app, domain, claim } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    const link = await bodyOf<ProofLinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))
    await app.post(`/api/domains/${domain.id}/archive`)

    const proved = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(proved.state).toBe("proved")

    const { links } = await bodyOf<{ links: readonly ProofLinkBody[] }>(
      await app.get(`/api/claims/${claim.id}/proof_links`),
    )
    expect(links).toMatchObject([{ slug: link.slug, standing: "revoked" }])
  })

  test("a link that outlived the revocation stops resolving on the record alone", async () => {
    const { app, domain, claim } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    const link = await bodyOf<ProofLinkBody>(await app.post(`/api/claims/${claim.id}/proof_links`))

    const held = await app.domains.findById(domain.id)
    if (held === null) throw new Error("the domain under test went missing")
    await app.domains.save({ ...held, archivedAt: NOW })

    expect((await app.get(`/p/${link.slug}`)).status).toBe(410)
    expect((await app.get(`/api/proofs/${link.slug}`)).status).toBe(410)
  })

  test("an archived name publishes no new link until it is back on the list", async () => {
    const { app, domain, claim } = await claimed(() => ({
      type: "found",
      value: "ownsi_v1_token_1",
    }))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    await app.post(`/api/claims/${claim.id}/proof_links`)
    await app.post(`/api/domains/${domain.id}/archive`)

    const refused = await app.post(`/api/claims/${claim.id}/proof_links`)
    expect(refused.status).toBe(409)

    await app.post(`/api/domains/${domain.id}/unarchive`)
    const again = await app.post(`/api/claims/${claim.id}/proof_links`)

    expect(again.status).toBe(201)
    expect((await bodyOf<ProofLinkBody>(again)).slug).toBe("slug2")
  })

  test("the window closing expires the claim and says so", async () => {
    const { app, claim, saidSince } = await claimed(() => NOT_PUBLISHED)

    app.at(daysAfter(NOW, 7))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)

    const expired = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(expired.state).toBe("expired")
    expect(saidSince()).toEqual(["expired"])
  })

  test("a reading that repeats itself says nothing, and a changed one speaks", async () => {
    let answer = NOT_PUBLISHED
    const { app, claim, saidSince } = await claimed(() => answer)

    app.at(secondsAfter(NOW, 30))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    app.at(secondsAfter(NOW, 3_600))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)
    expect(saidSince()).toEqual([])

    answer = CACHED_ABSENCE
    app.at(secondsAfter(NOW, 7_200))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)

    expect(saidSince()).toEqual(["progress"])
  })

  test("claiming again issues a new token and retires the old one", async () => {
    const { app, domain, claim } = await claimed(() => NOT_PUBLISHED)
    await app.post(`/api/claims/${claim.id}/cancel`)

    const second = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))
    expect(second.token).not.toBe(claim.token)

    await app.post(`/api/verifications/${second.verificationId}/runs`)
    expect(app.asked.at(-1)?.[1]).toEqual({
      domain: "acme.com",
      token: second.token,
      previousTokens: [claim.token],
    })
  })
})
