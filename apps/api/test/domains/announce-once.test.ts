import { describe, expect, test } from "bun:test"
import { announceOncePerDay } from "../../src/domains/application/announce-once.ts"
import type { ClaimAnnouncement } from "../../src/domains/domain/ports.ts"
import type { ClaimNotice } from "../../src/domains/domain/schedule.ts"
import { inMemorySentNotices } from "./in-memory-sent-notices.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const NUDGE: ClaimNotice = {
  kind: "nudge",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

const announcement = (notice: ClaimNotice, claimId = "clm_1"): ClaimAnnouncement => ({
  notice,
  claimId,
  userId: "usr_ada",
  domainId: "dom_1",
  domain: "acme.com",
  token: "ownsi_v1_token",
})

function announcer(start = NOW) {
  let now = start
  const sent: string[] = []

  const announce = announceOncePerDay({
    announce: async ({ claimId, notice }) => {
      sent.push(`${claimId}:${notice.kind}`)
    },
    sent: inMemorySentNotices(),
    clock: () => now,
  })

  return {
    announce,
    sent,
    at: (instant: Date) => {
      now = instant
    },
  }
}

const hoursAfter = (instant: Date, hours: number) => new Date(instant.getTime() + hours * 3_600_000)

describe("at most one email per claim per event type per day", () => {
  test("the second nudge inside the same day is dropped", async () => {
    const app = announcer()

    await app.announce(announcement(NUDGE))
    app.at(hoursAfter(NOW, 6))
    await app.announce(announcement(NUDGE))

    expect(app.sent).toEqual(["clm_1:nudge"])
  })

  test("the same nudge a day later goes out", async () => {
    const app = announcer()

    await app.announce(announcement(NUDGE))
    app.at(hoursAfter(NOW, 25))
    await app.announce(announcement(NUDGE))

    expect(app.sent).toEqual(["clm_1:nudge", "clm_1:nudge"])
  })

  test("the ceiling is per event type, so a warning still follows a nudge", async () => {
    const app = announcer()

    await app.announce(announcement(NUDGE))
    await app.announce(announcement({ kind: "expiring", diagnosis: NUDGE.diagnosis }))

    expect(app.sent).toEqual(["clm_1:nudge", "clm_1:expiring"])
  })

  test("the ceiling is per claim, so another claim is not silenced by this one", async () => {
    const app = announcer()

    await app.announce(announcement(NUDGE))
    await app.announce(announcement(NUDGE, "clm_2"))

    expect(app.sent).toEqual(["clm_1:nudge", "clm_2:nudge"])
  })
})
