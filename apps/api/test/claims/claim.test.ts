import { describe, expect, test } from "bun:test"
import { challengeRecords } from "../../src/claims/domain/challenge.ts"
import {
  cancel,
  expire,
  isOpen,
  openClaim,
  prove,
  provedAt,
} from "../../src/claims/domain/claim.ts"
import { maskEmail } from "../../src/claims/domain/coexistence.ts"
import { noticesBetween } from "../../src/claims/domain/notice.ts"
import { daysAfter } from "../../src/shared/time.ts"
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

const kindsOf = (notices: readonly { kind: string }[]) => notices.map((notice) => notice.kind)

describe("the window a claim runs in", () => {
  test("a claim opens for seven days and carries the token it was issued", () => {
    expect(OPEN.expiresAt).toEqual(daysAfter(NOW, 7))
    expect(isOpen(OPEN)).toBe(true)
    expect(OPEN.verificationId).toBeNull()
  })

  test("each of the three endings keeps the token and dates the claim", () => {
    for (const [ended, state] of [
      [prove(OPEN, NOW), "proved"],
      [expire(OPEN, NOW), "expired"],
      [cancel(OPEN, NOW), "canceled"],
    ] as const) {
      expect(ended.state).toBe(state)
      expect(ended.endedAt).toEqual(NOW)
      expect(ended.token).toBe(OPEN.token)
      expect(isOpen(ended)).toBe(false)
    }
  })

  test("only a proof carries a date a proof can be dated by", () => {
    expect(provedAt(prove(OPEN, NOW))).toEqual(NOW)
    expect(provedAt(expire(OPEN, NOW))).toBeNull()
  })
})

describe("the record to write", () => {
  test("an open claim names the host, the type and the token", () => {
    expect(challengeRecords(OPEN, "acme.com")).toEqual([
      {
        host: "_ownsi-challenge",
        name: "_ownsi-challenge.acme.com",
        type: "TXT",
        value: OPEN.token,
      },
    ])
  })

  test("an ended claim asks for nothing to be written", () => {
    expect(challengeRecords(cancel(OPEN, NOW), "acme.com")).toEqual([])
  })
})

describe("what a claim says out loud", () => {
  test("crossing day one nudges, and only once", () => {
    expect(kindsOf(noticesBetween(NOW, NOW, daysAfter(NOW, 1.1), NOT_PUBLISHED))).toEqual(["nudge"])
    expect(noticesBetween(NOW, daysAfter(NOW, 1.1), daysAfter(NOW, 1.5), NOT_PUBLISHED)).toEqual([])
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

describe("coexistence", () => {
  test("the other claimant is named only as far as the domain they used", () => {
    expect(maskEmail("marie@acme.com")).toBe("m•••@acme.com")
  })
})
