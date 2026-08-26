import { describe, expect, test } from "bun:test"
import type { Attestation } from "../../src/proof/domain/attestation.ts"
import {
  isLive,
  issueProofLink,
  PROOF_LINK_DAYS,
  revoked,
  standingOf,
} from "../../src/proof/domain/proof-link.ts"
import { daysAfter, secondsAfter } from "../../src/shared/time.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const ATTESTATION: Attestation = {
  domain: "acme.com",
  unicodeDomain: "acme.com",
  heldBy: "m•••@acme.com",
  token: "ownsi_v1_9f3a",
  provedAt: new Date("2026-08-21T09:30:00Z"),
}

const LINK = issueProofLink({
  slug: "8f2k91mx4c",
  claimId: "clm_1",
  attestation: ATTESTATION,
  issuedAt: NOW,
})

describe("a link to a proof", () => {
  test("resolves for seven days from the day it was issued", () => {
    expect(LINK.expiresAt).toEqual(daysAfter(NOW, PROOF_LINK_DAYS))
    expect(isLive(LINK, NOW)).toBe(true)
    expect(isLive(LINK, secondsAfter(daysAfter(NOW, PROOF_LINK_DAYS), -1))).toBe(true)
  })

  test("stops resolving the moment the window closes", () => {
    expect(standingOf(LINK, daysAfter(NOW, PROOF_LINK_DAYS))).toEqual({
      type: "expired",
      expiredAt: LINK.expiresAt,
    })
  })

  test("carries the attestation, so nothing it states can change later", () => {
    expect(LINK.attestation).toEqual(ATTESTATION)
    expect(LINK.attestation.provedAt).not.toEqual(LINK.issuedAt)
  })

  test("revoking it is dated once and never re-dated", () => {
    const first = revoked(LINK, secondsAfter(NOW, 60))
    const again = revoked(first, secondsAfter(NOW, 120))

    expect(again.revokedAt).toEqual(secondsAfter(NOW, 60))
    expect(standingOf(again, NOW)).toEqual({ type: "revoked", revokedAt: secondsAfter(NOW, 60) })
  })

  test("a revoked link is revoked, not expired, however long it sits there", () => {
    const taken = revoked(LINK, secondsAfter(NOW, 60))

    expect(standingOf(taken, daysAfter(NOW, 30)).type).toBe("revoked")
  })
})
