import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../src/domains/api/domain.response.ts"
import { daysAfter, secondsAfter } from "../src/shared/time.ts"
import type { VerificationResponse } from "../src/verification/api/verification.response.ts"
import type { AttemptOutcome } from "../src/verification/verification.contract.ts"
import { bodyOf, harness } from "./harness.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

type ClaimBody = Static<typeof ClaimDetailResponse>
type DomainBody = Static<typeof DomainResponse>
type VerificationBody = Static<typeof VerificationResponse>

async function claimed(answers: () => AttemptOutcome, name = "acme.com") {
  const app = harness({ now: NOW, answers })
  const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))
  const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

  return { app, domain, claim }
}

describe("from a name to a proof", () => {
  test("claiming a domain hands back the record to write and the process behind it", async () => {
    const { claim } = await claimed(() => NOT_PUBLISHED)

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
    const { app, claim } = await claimed(() => ({ type: "found", value: "ownsi_v1_token_1" }))
    const ran = await bodyOf<VerificationBody>(
      await app.post(`/api/verifications/${claim.verificationId}/runs`),
    )

    expect(ran.status).toBe("proved")

    const proved = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(proved.state).toBe("proved")
    expect(proved.endedAt).toBe(NOW.toISOString())
    expect(app.notified.map((one) => one.notice.kind)).toEqual(["proved"])
  })

  test("a record nobody published leaves the claim open and names the failure", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)
    const ran = await bodyOf<VerificationBody>(
      await app.post(`/api/verifications/${claim.verificationId}/runs`),
    )

    expect(ran.status).toBe("needs_attention")
    expect(ran.diagnosis?.code).toBe("not_published")

    const still = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(still.state).toBe("pending")
    expect(app.notified).toEqual([])
  })

  test("resolvers nobody could reach say nothing and move nothing", async () => {
    const { app, claim } = await claimed(() => ({ type: "unresolvable", resolvers: ["quad9"] }))
    const ran = await bodyOf<VerificationBody>(
      await app.post(`/api/verifications/${claim.verificationId}/runs`),
    )

    expect(ran.status).toBe("checking")
    expect(ran.diagnosis).toBeNull()
    expect(app.notified).toEqual([])
  })

  test("every run leaves evidence behind, and the proof rests on it", async () => {
    const { app, claim } = await claimed(() => ({ type: "found", value: "ownsi_v1_token_1" }))
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

  test("the window closing expires the claim and sends nothing", async () => {
    const { app, claim } = await claimed(() => NOT_PUBLISHED)

    app.at(daysAfter(NOW, 7))
    await app.post(`/api/verifications/${claim.verificationId}/runs`)

    const expired = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))
    expect(expired.state).toBe("expired")
    expect(app.notified).toEqual([])
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
