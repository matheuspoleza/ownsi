import { describe, expect, test } from "bun:test"
import { pendingClaim } from "../../src/domains/domain/account-domain.ts"
import { daysAfter, secondsAfter } from "../../src/domains/domain/claim.ts"
import type { Claimant } from "../../src/domains/domain/ports.ts"
import { createDomainsModule, type DomainsModule } from "../../src/domains/domains.module.ts"
import type { Clock } from "../../src/shared/clock.ts"
import type { Database } from "../../src/shared/database.ts"
import type { AttemptOutcome } from "../../src/verification/verification.contract.ts"
import { inMemoryDomainRepository } from "./in-memory-domain-repository.ts"
import { inMemorySentNotices } from "./in-memory-sent-notices.ts"

const ADA = "usr_ada"
const OPENED = new Date("2026-08-24T12:00:00Z")

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

function scheduler(outcome: AttemptOutcome = NOT_PUBLISHED, others: readonly Claimant[] = []) {
  let now = OPENED
  const announced: string[] = []
  const scheduled: Date[] = []
  const clock: Clock = () => now

  const module: DomainsModule = createDomainsModule(
    {
      config: { driver: "postgres", appUrl: "https://ownsi.dev" },
      clock,
      database: {} as Database,
      checkChallenge: async () => outcome,
      sendEmail: async () => {},
      scheduleClaim: async ({ checkAt }) => {
        scheduled.push(checkAt)
      },
    },
    {
      domains: inMemoryDomainRepository(),
      findCoexistence: async () => null,
      otherClaimants: async () => others,
      sentNotices: inMemorySentNotices(),
      announce: async ({ notice, userId }) => {
        announced.push(`${userId}:${notice.kind}`)
      },
    },
  )

  return {
    module,
    announced,
    scheduled,
    at: (instant: Date) => {
      now = instant
    },
  }
}

async function opened(app: ReturnType<typeof scheduler>) {
  const claimed = await app.module.claimDomain({ userId: ADA, domain: "acme.com" })
  if (!claimed.ok) throw new Error("the fixture failed to open a claim")

  return claimed.value.record.domain.id
}

describe("the clock's turn at a claim", () => {
  test("opening a claim hands the scheduler the moment of its first check", async () => {
    const app = scheduler()
    await opened(app)

    expect(app.scheduled).toEqual([secondsAfter(OPENED, 30)])
  })

  test("waking early changes nothing and asks to be woken at the same moment", async () => {
    const app = scheduler()
    const domainId = await opened(app)

    app.at(secondsAfter(OPENED, 5))
    const next = await app.module.checkWhenDue({ userId: ADA, domainId })

    expect(next).toEqual(secondsAfter(OPENED, 30))
    expect(app.announced).toEqual([])
  })

  test("waking on time checks, and answers with the moment after that", async () => {
    const app = scheduler()
    const domainId = await opened(app)
    const due = secondsAfter(OPENED, 30)

    app.at(due)
    const next = await app.module.checkWhenDue({ userId: ADA, domainId })

    expect(next).toEqual(secondsAfter(due, 30))
  })

  test("waking past the window expires the claim instead of checking it", async () => {
    const app = scheduler()
    const domainId = await opened(app)

    app.at(daysAfter(OPENED, 7))
    const next = await app.module.checkWhenDue({ userId: ADA, domainId })
    const read = await app.module.readDomain({ userId: ADA, id: domainId })

    expect(next).toBeNull()
    expect(read.ok && read.value.record.claim.state).toBe("expired")
    expect(app.announced).toEqual([])
  })

  test("a claim that ended while the scheduler slept asks for no further wake-up", async () => {
    const app = scheduler()
    const domainId = await opened(app)
    await app.module.cancelClaim({ userId: ADA, id: domainId })

    app.at(secondsAfter(OPENED, 30))

    expect(await app.module.checkWhenDue({ userId: ADA, domainId })).toBeNull()
  })

  test("the record appearing ends the watch and announces the proof", async () => {
    const app = scheduler({ type: "found", value: "ownsi_v1_token" })
    const domainId = await opened(app)

    app.at(secondsAfter(OPENED, 30))
    const next = await app.module.checkWhenDue({ userId: ADA, domainId })
    const read = await app.module.readDomain({ userId: ADA, id: domainId })

    expect(next).toBeNull()
    expect(read.ok && read.value.record.claim.state).toBe("proved")
    expect(app.announced).toEqual(["usr_ada:proved"])
  })

  test("the day-six warning arrives on the check that crosses it", async () => {
    const app = scheduler()
    const domainId = await opened(app)

    for (const day of [0.5, 1.5, 3.5, 6.5]) {
      app.at(daysAfter(OPENED, day))
      await app.module.checkWhenDue({ userId: ADA, domainId })
    }

    expect(app.announced).toEqual(["usr_ada:nudge", "usr_ada:nudge", "usr_ada:expiring"])
  })

  test("proving a name tells everyone else still claiming it", async () => {
    const grace: Claimant = {
      userId: "usr_grace",
      domainId: "dom_grace",
      claimId: "clm_grace",
      token: "ownsi_v1_grace",
    }
    const app = scheduler({ type: "found", value: "ownsi_v1_token" }, [grace])
    const domainId = await opened(app)

    app.at(secondsAfter(OPENED, 30))
    await app.module.checkWhenDue({ userId: ADA, domainId })

    expect(app.announced).toEqual(["usr_ada:proved", "usr_grace:coexistence"])
  })

  test("a claim nobody opened is not a claim to wake for", async () => {
    const app = scheduler()

    expect(await app.module.checkWhenDue({ userId: ADA, domainId: "dom_nothing" })).toBeNull()
  })
})

describe("what the scheduler leaves behind", () => {
  test("an expired claim keeps no next check", async () => {
    const app = scheduler()
    const domainId = await opened(app)

    app.at(daysAfter(OPENED, 7))
    await app.module.checkWhenDue({ userId: ADA, domainId })
    const read = await app.module.readDomain({ userId: ADA, id: domainId })

    expect(read.ok && pendingClaim(read.value.record)).toBeNull()
  })
})
