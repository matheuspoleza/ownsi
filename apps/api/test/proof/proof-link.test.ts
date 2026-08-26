import { describe, expect, test } from "bun:test"
import type { Attestation } from "../../src/proof/domain/attestation.ts"
import { isLive, issueProofLink, revoked, standingOf } from "../../src/proof/domain/proof-link.ts"
import { secondsAfter } from "../../src/shared/time.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const ATTESTATION: Attestation = {
  domain: "acme.com",
  unicodeDomain: "acme.com",
  heldBy: "m•••@acme.com",
  token: "ownsi_v1_9f3a",
  challengeHost: "_ownsi-challenge.acme.com",
  provider: "Cloudflare",
  provedAt: new Date("2026-08-21T09:30:00Z"),
}

const LINK = issueProofLink({
  slug: "8f2k91mx4c",
  claimId: "clm_1",
  attestation: ATTESTATION,
  issuedAt: NOW,
})

describe("a link to a proof", () => {
  test("resolves from the moment it is issued, with no clock that can end it", () => {
    expect(isLive(LINK)).toBe(true)
    expect(standingOf(LINK)).toEqual({ type: "live" })
  })

  test("carries the attestation, so nothing it states can change later", () => {
    expect(LINK.attestation).toEqual(ATTESTATION)
    expect(LINK.attestation.provedAt).not.toEqual(LINK.issuedAt)
  })

  test("taking it back is the only thing that stops it, and is dated once", () => {
    const first = revoked(LINK, secondsAfter(NOW, 60))
    const again = revoked(first, secondsAfter(NOW, 120))

    expect(again.revokedAt).toEqual(secondsAfter(NOW, 60))
    expect(standingOf(again)).toEqual({ type: "revoked", revokedAt: secondsAfter(NOW, 60) })
    expect(isLive(again)).toBe(false)
  })
})
