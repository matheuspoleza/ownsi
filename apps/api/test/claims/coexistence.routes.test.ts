import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { ClaimDetailResponse } from "../../src/claims/api/claim.response.ts"
import type { DomainResponse } from "../../src/domains/api/domain.response.ts"
import type { AttemptOutcome } from "../../src/verification/verification.contract.ts"
import { bodyOf, harness } from "../harness.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const FOUND: AttemptOutcome = { type: "found", value: "ownsi_v1_token_1" }

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

const THEIRS = { maskedEmail: "m•••@acme.com", provedAt: "2026-03-12T09:30:00Z" }

type ClaimBody = Static<typeof ClaimDetailResponse>
type DomainBody = Static<typeof DomainResponse>

async function claiming(answers: () => AttemptOutcome) {
  const app = harness({ now: NOW, answers, coexistence: THEIRS })
  const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
  const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

  return { app, claim }
}

describe("claiming a name somebody else has already proved", () => {
  test("says that it happened and names nobody, while the claim is still open", async () => {
    const { claim } = await claiming(() => NOT_PUBLISHED)

    expect(claim.state).toBe("pending")
    expect(claim.coexistence).toEqual({ type: "unnamed" })
    expect(JSON.stringify(claim)).not.toContain(THEIRS.maskedEmail)
    expect(JSON.stringify(claim)).not.toContain(THEIRS.provedAt)
  })

  test("names them once this account has proved it too", async () => {
    const { app, claim } = await claiming(() => FOUND)
    await app.post(`/api/verifications/${claim.verificationId}/runs`)

    const proved = await bodyOf<ClaimBody>(await app.get(`/api/claims/${claim.id}`))

    expect(proved.state).toBe("proved")
    expect(proved.coexistence).toEqual({ type: "named", ...THEIRS })
  })

  test("stays null when nobody else has proved the name", async () => {
    const app = harness({ now: NOW, answers: () => NOT_PUBLISHED })
    const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const claim = await bodyOf<ClaimBody>(await app.post("/api/claims", { domainId: domain.id }))

    expect(claim.coexistence).toBeNull()
  })
})
