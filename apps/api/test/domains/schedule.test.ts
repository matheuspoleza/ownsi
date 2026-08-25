import { describe, expect, test } from "bun:test"
import { applyAttempt, expire, isDue } from "../../src/domains/domain/checkpoint.ts"
import { daysAfter, openClaim, secondsAfter } from "../../src/domains/domain/claim.ts"
import {
  type ClaimNotice,
  intervalSeconds,
  noticesBetween,
} from "../../src/domains/domain/schedule.ts"
import type { Diagnosis } from "../../src/verification/verification.contract.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const OPEN = openClaim({
  id: "clm_1",
  userId: "usr_ada",
  domainId: "dom_1",
  token: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
  openedAt: NOW,
})

const NOT_PUBLISHED: Diagnosis = {
  code: "not_published",
  observed: { nameservers: ["kate.ns.cloudflare.com"] },
}

const secondsUntil = (at: Date, from: Date) => (at.getTime() - from.getTime()) / 1_000

const kindsOf = (notices: readonly ClaimNotice[]) => notices.map((notice) => notice.kind)

describe("how often a pending claim is looked at", () => {
  test("a fresh claim is checked in seconds, a day-old one in hours", () => {
    expect(intervalSeconds(10, 0)).toBe(30)
    expect(intervalSeconds(2_000, 0)).toBe(300)
    expect(intervalSeconds(10_000, 0)).toBe(1_800)
    expect(intervalSeconds(50_000, 0)).toBe(7_200)
    expect(intervalSeconds(200_000, 0)).toBe(21_600)
  })

  test("resolvers that keep failing are asked less and less, up to a ceiling", () => {
    expect(intervalSeconds(10, 1)).toBe(60)
    expect(intervalSeconds(10, 3)).toBe(240)
    expect(intervalSeconds(10, 9)).toBe(240)
  })

  test("the first check is the one the claim already promised", () => {
    expect(secondsUntil(OPEN.nextCheckAt, NOW)).toBe(30)
    expect(isDue(OPEN, NOW)).toBe(false)
    expect(isDue(OPEN, secondsAfter(NOW, 30))).toBe(true)
  })
})

describe("what a check does to the schedule", () => {
  test("a cached negative is waited out, not polled through", () => {
    const at = secondsAfter(NOW, 30)
    const diagnosis: Diagnosis = { code: "negative_cache", observed: { secondsRemaining: 240 } }
    const { claim } = applyAttempt(OPEN, { type: "absent", diagnosis }, at)

    expect(claim.state).toBe("pending")
    expect(claim.state === "pending" && secondsUntil(claim.nextCheckAt, at)).toBe(240)
    expect(claim.state === "pending" && claim.waitEstimate).toEqual({
      reason: "negative_cache",
      secondsRemaining: 240,
    })
  })

  test("an old claim stops asking every five minutes, whatever the SOA says", () => {
    const at = daysAfter(NOW, 2)
    const diagnosis: Diagnosis = { code: "negative_cache", observed: { secondsRemaining: 300 } }
    const { claim } = applyAttempt(OPEN, { type: "absent", diagnosis }, at)

    expect(claim.state === "pending" && secondsUntil(claim.nextCheckAt, at)).toBe(21_600)
  })

  test("the last check of a claim's life lands exactly on its expiry", () => {
    const at = daysAfter(NOW, 6.9)
    const { claim } = applyAttempt(OPEN, { type: "absent", diagnosis: NOT_PUBLISHED }, at)

    expect(claim.state === "pending" && claim.nextCheckAt).toEqual(OPEN.expiresAt)
  })

  test("the record appearing ends the claim, and nothing is scheduled after that", () => {
    const { claim, notices } = applyAttempt(OPEN, { type: "found", value: OPEN.token }, NOW)

    expect(claim.state).toBe("proved")
    expect(notices).toEqual([{ kind: "proved", provedAt: NOW }])
  })

  test("waking past the window expires the claim without checking it", () => {
    const { claim, notices } = expire(OPEN, daysAfter(NOW, 7))

    expect(claim.state).toBe("expired")
    expect(notices).toEqual([])
  })
})

describe("what a check says out loud", () => {
  test("a resolver outage sends zero emails", () => {
    const at = daysAfter(NOW, 6.5)
    const { claim, notices } = applyAttempt(OPEN, { type: "unresolvable", resolvers: [] }, at)

    expect(notices).toEqual([])
    expect(claim).toMatchObject({
      lastCheck: OPEN.lastCheck,
      waitEstimate: OPEN.waitEstimate,
      consecutiveFailures: 1,
    })
  })

  test("crossing day one nudges, and only once", () => {
    const crossing = applyAttempt(
      { ...OPEN, lastCheck: { outcome: "absent", diagnosis: NOT_PUBLISHED, at: NOW } },
      { type: "absent", diagnosis: NOT_PUBLISHED },
      daysAfter(NOW, 1.1),
    )
    const after = applyAttempt(
      {
        ...OPEN,
        lastCheck: { outcome: "absent", diagnosis: NOT_PUBLISHED, at: daysAfter(NOW, 1.1) },
      },
      { type: "absent", diagnosis: NOT_PUBLISHED },
      daysAfter(NOW, 1.5),
    )

    expect(kindsOf(crossing.notices)).toEqual(["nudge"])
    expect(after.notices).toEqual([])
  })

  test("day six warns that the window closes tomorrow", () => {
    expect(
      kindsOf(noticesBetween(NOW, daysAfter(NOW, 5.9), daysAfter(NOW, 6.1), NOT_PUBLISHED)),
    ).toEqual(["expiring"])
  })

  test("an outage long enough to cover both still says each thing once", () => {
    expect(kindsOf(noticesBetween(NOW, NOW, daysAfter(NOW, 6.5), NOT_PUBLISHED))).toEqual([
      "nudge",
      "expiring",
    ])
  })
})
