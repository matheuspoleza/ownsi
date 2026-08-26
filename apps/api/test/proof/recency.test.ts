import { describe, expect, test } from "bun:test"
import { recencyOf } from "../../src/proof/domain/recency.ts"

const PROVED = new Date("2026-03-12T09:30:00Z")
const LATER = new Date("2026-09-03T11:00:00Z")

describe("where a proof sits among the proofs of its name", () => {
  test("nothing later means this one is the latest", () => {
    expect(recencyOf(PROVED, null)).toEqual({ type: "latest" })
  })

  test("the newest proof of the name is itself", () => {
    expect(recencyOf(PROVED, PROVED)).toEqual({ type: "latest" })
  })

  test("a proof made afterwards is named with its date, and takes nothing away", () => {
    expect(recencyOf(PROVED, LATER)).toEqual({ type: "earlier", latestProvedAt: LATER })
  })

  test("a proof made before this one does not unseat it", () => {
    expect(recencyOf(LATER, PROVED)).toEqual({ type: "latest" })
  })
})
