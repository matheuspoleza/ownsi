import { describe, expect, test } from "bun:test"
import type { Claim } from "../../src/claims/domain/claim.ts"
import { cancel, openClaim, prove, verifiedBy } from "../../src/claims/domain/claim.ts"
import { type ClaimRow, claimColumns, toClaim } from "../../src/claims/infra/claim.repository.ts"

const NOW = new Date("2026-08-24T12:00:00Z")
const LATER = new Date("2026-08-24T12:05:00Z")

const OPEN = openClaim({
  id: "clm_1",
  userId: "usr_ada",
  domainId: "dom_1",
  token: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
  openedAt: NOW,
})

const stored = (claim: Claim): Claim =>
  toClaim({ id: claim.id, domainId: claim.domainId, ...claimColumns(claim) } as ClaimRow)

describe("a claim survives the round trip through Postgres", () => {
  test("open, with no process behind it yet", () => {
    expect(stored(OPEN)).toEqual(OPEN)
  })

  test("open, holding the receipt of the process it delegated to", () => {
    const delegated = verifiedBy(OPEN, "vrf_1")

    expect(stored(delegated)).toEqual(delegated)
  })

  test("proved, dated by the run that earned it", () => {
    const proved = prove(verifiedBy(OPEN, "vrf_1"), LATER)

    expect(stored(proved)).toEqual(proved)
  })

  test("canceled, keeping the token it was issued and the window it was given", () => {
    const canceled = cancel(OPEN, LATER)

    expect(stored(canceled)).toEqual(canceled)
    expect(claimColumns(canceled).expiresAt).toEqual(OPEN.expiresAt)
  })
})
