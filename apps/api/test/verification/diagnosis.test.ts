import { describe, expect, test } from "bun:test"
import { CHALLENGE, SAMPLES } from "../../scripts/emit-docs.ts"
import {
  awaits,
  DIAGNOSIS_CODES,
  type Diagnosis,
  explain,
  formatDuration,
} from "../../src/verification/domain/diagnosis.ts"

const SENTENCE_CEILING = 220

const diagnosed: readonly Diagnosis[] = DIAGNOSIS_CODES.map((code) => SAMPLES[code])

const explanationOf = (diagnosis: Diagnosis) => explain(diagnosis, CHALLENGE)

const findByCode = (code: Diagnosis["code"]): Diagnosis => SAMPLES[code]

describe("the diagnostics catalogue", () => {
  test("every code has a fixture that reproduces it", () => {
    const reproduced = new Set(diagnosed.map((diagnosis) => diagnosis.code))
    expect([...reproduced].sort()).toEqual([...DIAGNOSIS_CODES].sort())
  })

  test("every diagnosis names one cause and one fix", () => {
    for (const diagnosis of diagnosed) {
      const { cause, fix } = explanationOf(diagnosis)

      expect(cause.length).toBeGreaterThan(0)
      expect(fix.length).toBeGreaterThan(0)
      expect(cause.endsWith(".")).toBe(true)
      expect(fix.endsWith(".")).toBe(true)
    }
  })

  test("no sentence leaks an unfilled value", () => {
    for (const diagnosis of diagnosed) {
      const { cause, fix } = explanationOf(diagnosis)
      expect(`${cause} ${fix}`).not.toMatch(/undefined|NaN|\[object Object\]/)
    }
  })

  test("no two codes explain themselves the same way", () => {
    const causes = DIAGNOSIS_CODES.map((code) => explanationOf(findByCode(code)).cause)
    expect(new Set(causes).size).toBe(causes.length)
  })

  test("the fix carries the token whenever the token is what to write", () => {
    for (const code of [
      "foreign_token",
      "expired_token",
      "value_formatted",
      "record_absent",
    ] as const) {
      expect(explanationOf(findByCode(code)).fix).toContain(CHALLENGE.token)
    }
  })

  test("the negative cache is quantified, not called propagation", () => {
    const { cause, fix } = explanationOf(findByCode("negative_cache"))

    expect(fix).toContain("4 minutes")
    expect(`${cause} ${fix}`.toLowerCase()).not.toContain("propagation")
  })

  test("a sentence stays a sentence", () => {
    for (const diagnosis of diagnosed) {
      const { cause, fix } = explanationOf(diagnosis)
      expect(cause.length).toBeLessThanOrEqual(SENTENCE_CEILING)
      expect(fix.length).toBeLessThanOrEqual(SENTENCE_CEILING)
    }
  })
})

describe("who a diagnosis is waiting on", () => {
  test("a fix the claimant cannot perform is the only one that waits on the resolvers", () => {
    const resolvers = diagnosed.filter((diagnosis) => awaits(diagnosis) === "resolvers")

    expect(resolvers.map((diagnosis) => diagnosis.code)).toEqual(["negative_cache"])
  })

  test("the one that waits on nobody is the one that asks for nothing", () => {
    for (const diagnosis of diagnosed) {
      const asksForNothing = explain(diagnosis, CHALLENGE).fix.startsWith("Nothing to do")
      expect(asksForNothing).toBe(awaits(diagnosis) === "resolvers")
    }
  })

  test("the explanation carries it, so a reader never maps codes itself", () => {
    expect(explain(SAMPLES.negative_cache, CHALLENGE).awaits).toBe("resolvers")
    expect(explain(SAMPLES.not_published, CHALLENGE).awaits).toBe("claimant")
  })
})

describe("formatDuration", () => {
  test.each([
    [1, "1 second"],
    [45, "45 seconds"],
    [60, "1 minute"],
    [240, "4 minutes"],
    [3_600, "1 hour"],
    [86_400, "24 hours"],
  ])("%i seconds reads as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })
})
