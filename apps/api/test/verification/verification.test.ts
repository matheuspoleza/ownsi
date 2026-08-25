import { describe, expect, test } from "bun:test"
import { daysAfter, secondsAfter } from "../../src/shared/time.ts"
import type { AttemptOutcome } from "../../src/verification/domain/attempt.ts"
import { intervalSeconds } from "../../src/verification/domain/backoff.ts"
import type { Diagnosis } from "../../src/verification/domain/diagnosis.ts"
import {
  isDue,
  recordAttempt,
  runningState,
  start,
  stop,
  type Verification,
  waitEstimate,
} from "../../src/verification/domain/verification.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const RUNNING: Verification = start({
  id: "vrf_1",
  subjectId: "clm_1",
  ownerId: "usr_ada",
  method: "dns_txt",
  challenge: { domain: "acme.com", token: "ownsi_v1_token", previousTokens: [] },
  deadline: daysAfter(NOW, 7),
  startedAt: NOW,
})

const NOT_PUBLISHED: Diagnosis = {
  code: "not_published",
  observed: { nameservers: ["kate.ns.cloudflare.com"] },
}

const absent = (diagnosis: Diagnosis): AttemptOutcome => ({ type: "absent", diagnosis })

const secondsUntil = (at: Date | null, from: Date) =>
  at === null ? null : (at.getTime() - from.getTime()) / 1_000

describe("how often a running verification reads DNS", () => {
  test("a fresh one is read in seconds, a day-old one in hours", () => {
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

  test("the first run is the one starting already promised", () => {
    expect(secondsUntil(RUNNING.nextRunAt, NOW)).toBe(30)
    expect(isDue(RUNNING, NOW)).toBe(false)
    expect(isDue(RUNNING, secondsAfter(NOW, 30))).toBe(true)
  })

  test("a cached negative is waited out, not polled through", () => {
    const at = secondsAfter(NOW, 30)
    const diagnosis: Diagnosis = { code: "negative_cache", observed: { secondsRemaining: 240 } }
    const moved = recordAttempt(RUNNING, absent(diagnosis), at)

    expect(secondsUntil(moved.nextRunAt, at)).toBe(240)
    expect(waitEstimate(moved, at)).toEqual({ reason: "negative_cache", secondsRemaining: 240 })
    expect(runningState(moved)).toBe("propagating")
  })

  test("an old verification stops asking every five minutes, whatever the SOA says", () => {
    const at = daysAfter(NOW, 2)
    const diagnosis: Diagnosis = { code: "negative_cache", observed: { secondsRemaining: 300 } }

    expect(secondsUntil(recordAttempt(RUNNING, absent(diagnosis), at).nextRunAt, at)).toBe(21_600)
  })

  test("the last run of a verification's life lands exactly on its deadline", () => {
    const at = daysAfter(NOW, 6.9)

    expect(recordAttempt(RUNNING, absent(NOT_PUBLISHED), at).nextRunAt).toEqual(RUNNING.deadline)
  })
})

describe("what a run does to the process", () => {
  test("the record appearing proves it, and nothing is scheduled after that", () => {
    const moved = recordAttempt(RUNNING, { type: "found", value: RUNNING.challenge.token }, NOW)

    expect(moved.status).toBe("proved")
    expect(moved.nextRunAt).toBeNull()
  })

  test("a record nobody published asks the owner to act, with no wait to quote", () => {
    const moved = recordAttempt(RUNNING, absent(NOT_PUBLISHED), secondsAfter(NOW, 30))

    expect(runningState(moved)).toBe("needs_attention")
    expect(waitEstimate(moved, secondsAfter(NOW, 30))).toBeNull()
  })

  test("resolvers nobody could reach change nothing the verification says", () => {
    const at = daysAfter(NOW, 6.5)
    const moved = recordAttempt(RUNNING, { type: "unresolvable", resolvers: [] }, at)

    expect(moved).toMatchObject({
      status: "running",
      lastRun: RUNNING.lastRun,
      consecutiveFailures: 1,
    })
    expect(runningState(moved)).toBe("checking")
  })

  test("stopping ends the process and cancels the next run", () => {
    const stopped = stop(RUNNING)

    expect(stopped.status).toBe("stopped")
    expect(stopped.nextRunAt).toBeNull()
  })
})
