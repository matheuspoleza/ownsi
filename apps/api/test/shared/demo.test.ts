import { describe, expect, test } from "bun:test"
import { CHECK_OUTCOMES, CLAIM_STATUSES } from "../../src/shared/claim-status.ts"
import { DEMO_CLAIMS } from "../../src/shared/demo.ts"

describe("the demo catalogue", () => {
  test("one domain reproduces one screen", () => {
    const domains = DEMO_CLAIMS.map((claim) => claim.domain)
    expect(new Set(domains).size).toBe(domains.length)
  })

  test("every status a claim can be in has a domain that shows it", () => {
    const shown = new Set(DEMO_CLAIMS.map((claim) => claim.status))
    expect([...shown].sort()).toEqual([...CLAIM_STATUSES].sort())
  })

  test("every check outcome has a domain that shows it", () => {
    const shown = new Set(
      DEMO_CLAIMS.map((claim) => claim.lastOutcome).filter((outcome) => outcome !== null),
    )
    expect([...shown].sort()).toEqual([...CHECK_OUTCOMES].sort())
  })

  test("needs_attention always names what to do about it", () => {
    const mute = DEMO_CLAIMS.filter(
      (claim) => claim.status === "needs_attention" && claim.diagnosis === null,
    )
    expect(mute.map((claim) => claim.domain)).toEqual([])
  })

  test("only a proved claim carries dates, and it carries both", () => {
    for (const claim of DEMO_CLAIMS) {
      const dated = claim.firstVerifiedAt !== null && claim.lastConfirmedAt !== null
      const undated = claim.firstVerifiedAt === null && claim.lastConfirmedAt === null

      expect(dated || undated).toBe(true)
      expect(dated).toBe(claim.status === "proved")
    }
  })

  test("a confirmation never predates the proof it confirms", () => {
    for (const claim of DEMO_CLAIMS) {
      if (claim.firstVerifiedAt === null || claim.lastConfirmedAt === null) continue
      expect(Date.parse(claim.lastConfirmedAt)).toBeGreaterThanOrEqual(
        Date.parse(claim.firstVerifiedAt),
      )
    }
  })

  test("unresolvable is our failure, so it moves no claim and dates nothing", () => {
    for (const claim of DEMO_CLAIMS) {
      if (claim.lastOutcome !== "unresolvable") continue
      expect(claim.status).toBe("pending")
      expect(claim.diagnosis).toBeNull()
    }
  })

  test("coexistence masks the local part and keeps the domain", () => {
    for (const claim of DEMO_CLAIMS) {
      if (claim.coexistence === null) continue
      expect(claim.status).toBe("proved")
      expect(claim.coexistence.maskedEmail).toMatch(/^[^@]•+@[^@]+\.[^@]+$/)
    }
  })
})
