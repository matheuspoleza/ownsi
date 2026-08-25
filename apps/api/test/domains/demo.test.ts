import { describe, expect, test } from "bun:test"
import {
  CHECK_OUTCOMES,
  CLAIM_STATES,
  CLAIM_STATUSES,
  statusWhilePending,
} from "../../src/domains/domain/claim-lifecycle.ts"
import { DEMO_DOMAINS, type DemoClaim, type DemoDomain } from "../../src/domains/infra/demo.ts"

const claimsOf = (domain: DemoDomain): readonly DemoClaim[] => [domain.claim, ...domain.history]

const everyClaim = DEMO_DOMAINS.flatMap(claimsOf)

const statusOf = (claim: DemoClaim) => {
  if (claim.state !== "pending") return claim.state
  if (claim.check?.outcome !== "absent") return "pending"
  return statusWhilePending(claim.check.diagnosis.code)
}

describe("the demo catalogue", () => {
  test("one domain reproduces one screen", () => {
    const names = DEMO_DOMAINS.map((domain) => domain.domain)
    expect(new Set(names).size).toBe(names.length)
  })

  test("every state a claim can be in has a domain that shows it", () => {
    const shown = new Set(everyClaim.map((claim) => claim.state))
    expect([...shown].sort()).toEqual([...CLAIM_STATES].sort())
  })

  test("every status a screen can render has a domain that shows it", () => {
    const shown = new Set(everyClaim.map(statusOf))
    expect([...shown].sort()).toEqual([...CLAIM_STATUSES].sort())
  })

  test("every check outcome has a domain that shows it", () => {
    const shown = new Set(
      everyClaim.map((claim) => claim.check?.outcome).filter((outcome) => outcome !== undefined),
    )
    expect([...shown].sort()).toEqual([...CHECK_OUTCOMES].sort())
  })

  test("a claim never ends before it was opened", () => {
    for (const claim of everyClaim) {
      if (claim.state === "pending") continue
      expect(claim.endedDaysAgo).toBeLessThanOrEqual(claim.openedDaysAgo)
    }
  })

  test("history runs backwards from the claim in front, and none of it is open", () => {
    for (const domain of DEMO_DOMAINS) {
      const opened = claimsOf(domain).map((claim) => claim.openedDaysAgo)
      expect(opened).toEqual([...opened].sort((left, right) => left - right))

      for (const older of domain.history) expect(older.state).not.toBe("pending")
    }
  })

  test("unresolvable is our failure, so it moves no claim and diagnoses nothing", () => {
    for (const claim of everyClaim) {
      if (claim.check?.outcome !== "unresolvable") continue
      expect(claim.state).toBe("pending")
      expect(statusOf(claim)).toBe("pending")
    }
  })

  test("archiving retracts nothing and leaves no claim open", () => {
    for (const domain of DEMO_DOMAINS) {
      if (domain.archivedDaysAgo === null) continue
      expect(domain.claim.state).not.toBe("pending")
    }
  })

  test("coexistence is only ever shown next to a proof", () => {
    for (const domain of DEMO_DOMAINS) {
      if (domain.coexistence === null) continue
      expect(claimsOf(domain).some((claim) => claim.state === "proved")).toBe(true)
      expect(domain.coexistence.maskedEmail).toMatch(/^[^@]•+@[^@]+\.[^@]+$/)
    }
  })
})
