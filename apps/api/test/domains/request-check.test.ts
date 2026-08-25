import { describe, expect, test } from "bun:test"
import { pendingClaim } from "../../src/domains/domain/account-domain.ts"
import { claimStatus } from "../../src/domains/domain/claim.ts"
import { createDomainsModule, type DomainsModule } from "../../src/domains/domains.module.ts"
import { fixedClock } from "../../src/shared/clock.ts"
import type { Database } from "../../src/shared/database.ts"
import type {
  AttemptOutcome,
  ChallengeRequest,
  CheckChallenge,
} from "../../src/verification/verification.contract.ts"
import { inMemoryDomainRepository } from "./in-memory-domain-repository.ts"
import { inMemorySentNotices } from "./in-memory-sent-notices.ts"

const ADA = "usr_ada"
const NOW = new Date("2026-08-24T12:00:00Z")

const answering =
  (...outcomes: readonly AttemptOutcome[]): CheckChallenge =>
  async () =>
    outcomes[0] ?? { type: "unresolvable", resolvers: [] }

function module(checkChallenge: CheckChallenge): DomainsModule {
  let tokens = 0

  return createDomainsModule(
    {
      config: { driver: "postgres", appUrl: "https://ownsi.dev" },
      clock: fixedClock(NOW),
      database: {} as Database,
      checkChallenge,
      sendEmail: async () => {},
      scheduleClaim: async () => {},
    },
    {
      domains: inMemoryDomainRepository(),
      announce: async () => {},
      otherClaimants: async () => [],
      sentNotices: inMemorySentNotices(),
      findCoexistence: async () => null,
      generateToken: () => `ownsi_v1_token_${++tokens}`,
    },
  )
}

async function claimed(app: DomainsModule, domain = "acme.com") {
  const opened = await app.claimDomain({ userId: ADA, domain })
  if (!opened.ok) throw new Error("the fixture failed to open a claim")

  const { record } = opened.value
  const open = pendingClaim(record)
  if (!open) throw new Error("the fixture opened no claim")

  return { record, domain: record.domain, claim: open }
}

async function checkOnce(outcome: AttemptOutcome) {
  const app = module(answering(outcome))
  const { domain } = await claimed(app)
  const checked = await app.requestCheck({ userId: ADA, id: domain.id })
  if (!checked.ok) throw new Error("the check did not reach the claim")

  return checked.value.record
}

describe("asking for a check now", () => {
  test("the token being there ends the claim as proved", async () => {
    const record = await checkOnce({ type: "found", value: "ownsi_v1_token_1" })

    expect(claimStatus(record.claim)).toBe("proved")
    expect(record.claim.lastCheck).toMatchObject({ outcome: "found", at: NOW })
  })

  test("a cached negative turns the wait into a number", async () => {
    const record = await checkOnce({
      type: "absent",
      diagnosis: { code: "negative_cache", observed: { secondsRemaining: 240 } },
    })

    expect(claimStatus(record.claim)).toBe("propagating")
    expect(record.claim).toMatchObject({
      waitEstimate: { reason: "negative_cache", secondsRemaining: 240 },
    })
  })

  test("a record nobody published asks the owner to act", async () => {
    const record = await checkOnce({
      type: "absent",
      diagnosis: { code: "record_absent", observed: { answer: { type: "nxdomain" } } },
    })

    expect(claimStatus(record.claim)).toBe("needs_attention")
    expect(record.claim).toMatchObject({ waitEstimate: null })
  })

  test("resolvers nobody could reach change nothing the claim says", async () => {
    const app = module(answering({ type: "unresolvable", resolvers: ["cloudflare"] }))
    const { domain, claim } = await claimed(app)
    const checked = await app.requestCheck({ userId: ADA, id: domain.id })
    if (!checked.ok) throw new Error("the check did not reach the claim")

    expect(checked.value.record.claim).toMatchObject({
      state: "pending",
      lastCheck: claim.lastCheck,
      waitEstimate: claim.waitEstimate,
      consecutiveFailures: 1,
    })
  })

  test("the claim carries the live token and every token it has retired", async () => {
    const asked: ChallengeRequest[] = []
    const app = module(async (request) => {
      asked.push(request)
      return { type: "unresolvable", resolvers: [] }
    })

    const { domain } = await claimed(app)
    await app.cancelClaim({ userId: ADA, id: domain.id })
    await claimed(app)
    await app.requestCheck({ userId: ADA, id: domain.id })

    expect(asked).toEqual([
      {
        method: "dns_txt",
        domain: "acme.com",
        token: "ownsi_v1_token_2",
        previousTokens: ["ownsi_v1_token_1"],
      },
    ])
  })

  test("a claim already ended is never checked", async () => {
    const asked: ChallengeRequest[] = []
    const app = module(async (request) => {
      asked.push(request)
      return { type: "unresolvable", resolvers: [] }
    })

    const { domain } = await claimed(app)
    await app.cancelClaim({ userId: ADA, id: domain.id })
    const checked = await app.requestCheck({ userId: ADA, id: domain.id })

    expect(checked).toMatchObject({ ok: false, error: { type: "claim_ended" } })
    expect(asked).toEqual([])
  })
})
