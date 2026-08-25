import { describe, expect, test } from "bun:test"
import { applyAttempt } from "../../src/domains/domain/checkpoint.ts"
import {
  type Claim,
  type ClaimFacts,
  daysAfter,
  end,
  openClaim,
  secondsAfter,
} from "../../src/domains/domain/claim.ts"
import { CLAIM_WINDOW_DAYS } from "../../src/domains/domain/claim-lifecycle.ts"
import { type ClaimRow, claimColumns, toClaim } from "../../src/domains/infra/domain-repository.ts"
import type { Diagnosis } from "../../src/verification/verification.contract.ts"

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
  test("open, never checked", () => {
    expect(stored(OPEN)).toEqual(OPEN)
  })

  test("waiting on a cached negative, with the diagnosis it was given", () => {
    const diagnosis: Diagnosis = { code: "negative_cache", observed: { secondsRemaining: 240 } }
    const waiting = applyAttempt(OPEN, { type: "absent", diagnosis }, LATER).claim

    expect(stored(waiting)).toEqual(waiting)
  })

  test("a diagnosis carrying a list of values", () => {
    const diagnosis: Diagnosis = {
      code: "no_matching_record",
      observed: { values: ["v=spf1 -all", "google-site-verification=abc"] },
    }
    const stuck = applyAttempt(OPEN, { type: "absent", diagnosis }, LATER).claim

    expect(stored(stuck)).toEqual(stuck)
  })

  test("proved, dated by the check that earned it", () => {
    const proved = applyAttempt(OPEN, { type: "found", value: OPEN.token }, LATER).claim

    expect(stored(proved)).toEqual(proved)
  })

  test("canceled, keeping what the last check had said", () => {
    const canceled = end(OPEN, "canceled", LATER)

    expect(stored(canceled)).toEqual(canceled)
  })

  test("an ended claim still reports the window it was given", () => {
    const canceled = end(OPEN, "canceled", LATER)

    expect(claimColumns(canceled).expiresAt).toEqual(daysAfter(NOW, CLAIM_WINDOW_DAYS))
  })

  test("a diagnosis the database no longer recognises never accuses the domain", () => {
    const facts: ClaimFacts = {
      id: "clm_1",
      userId: "usr_ada",
      domainId: "dom_1",
      token: OPEN.token,
      lastCheck: null,
      createdAt: NOW,
    }
    const row = {
      ...facts,
      state: "PENDING",
      expiresAt: daysAfter(NOW, CLAIM_WINDOW_DAYS),
      endedAt: null,
      waitReason: null,
      waitSecondsRemaining: null,
      lastCheckOutcome: "ABSENT",
      lastCheckAt: LATER,
      lastDiagnosis: { code: "a_code_this_build_never_heard_of" },
      nextCheckAt: secondsAfter(LATER, 300),
      consecutiveFailures: 0,
    } as unknown as ClaimRow

    expect(toClaim(row).lastCheck).toEqual({ outcome: "unresolvable", at: LATER })
  })
})
