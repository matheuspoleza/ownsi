import { describe, expect, test } from "bun:test"
import { daysAfter, secondsAfter } from "../../src/shared/time.ts"
import type { AttemptOutcome, VerificationAttempt } from "../../src/verification/domain/attempt.ts"
import type { Diagnosis } from "../../src/verification/domain/diagnosis.ts"
import {
  recordAttempt,
  start,
  type Verification,
} from "../../src/verification/domain/verification.ts"
import {
  type AttemptRow,
  attemptColumns,
  toAttempt,
  toVerification,
  type VerificationRow,
  verificationColumns,
} from "../../src/verification/infra/verification.repository.ts"

const NOW = new Date("2026-08-24T12:00:00Z")
const LATER = new Date("2026-08-24T12:05:00Z")

const RUNNING = start({
  id: "vrf_1",
  subjectId: "clm_1",
  ownerId: "usr_ada",
  method: "dns_txt",
  challenge: { domain: "acme.com", token: "ownsi_v1_token", previousTokens: ["ownsi_v1_old"] },
  deadline: daysAfter(NOW, 7),
  startedAt: NOW,
})

const stored = (verification: Verification): Verification =>
  toVerification({
    id: verification.id,
    ...verificationColumns(verification),
  } as unknown as VerificationRow)

const replayed = (attempt: VerificationAttempt): VerificationAttempt =>
  toAttempt({ id: attempt.id, ...attemptColumns(attempt) } as unknown as AttemptRow)

const attempt = (outcome: AttemptOutcome): VerificationAttempt => ({
  id: "att_1",
  verificationId: "vrf_1",
  trigger: "scheduled",
  outcome,
  latencyMs: 42,
  at: LATER,
})

describe("a verification survives the round trip through Postgres", () => {
  test("running, never read", () => {
    expect(stored(RUNNING)).toEqual(RUNNING)
  })

  test("waiting on a cached negative, with the diagnosis it was given", () => {
    const diagnosis: Diagnosis = { code: "negative_cache", observed: { secondsRemaining: 240 } }
    const waiting = recordAttempt(RUNNING, { type: "absent", diagnosis }, LATER)

    expect(stored(waiting)).toEqual(waiting)
  })

  test("a diagnosis carrying a list of values", () => {
    const diagnosis: Diagnosis = {
      code: "no_matching_record",
      observed: { values: ["v=spf1 -all", "google-site-verification=abc"] },
    }
    const stuck = recordAttempt(RUNNING, { type: "absent", diagnosis }, LATER)

    expect(stored(stuck)).toEqual(stuck)
  })

  test("proved, dated by the run that earned it", () => {
    const proved = recordAttempt(RUNNING, { type: "found", value: "ownsi_v1_token" }, LATER)

    expect(stored(proved)).toEqual(proved)
  })

  test("the challenge comes back whole, so a scheduled run needs no claim", () => {
    expect(stored(RUNNING).challenge).toEqual(RUNNING.challenge)
  })

  test("a diagnosis the database no longer recognises never accuses the domain", () => {
    const row = {
      ...verificationColumns(RUNNING),
      id: "vrf_1",
      lastOutcome: "ABSENT",
      lastRunAt: LATER,
      lastDiagnosis: { code: "a_code_this_build_never_heard_of" },
      nextRunAt: secondsAfter(LATER, 300),
    } as unknown as VerificationRow

    expect(toVerification(row).lastRun).toEqual({ outcome: "unresolvable", at: LATER })
  })
})

describe("an attempt survives the round trip through Postgres", () => {
  test("the record it found", () => {
    const found = attempt({ type: "found", value: "ownsi_v1_token" })

    expect(replayed(found)).toEqual(found)
  })

  test("the diagnosis it named", () => {
    const absent = attempt({
      type: "absent",
      diagnosis: { code: "record_absent", observed: { answer: { type: "nxdomain" } } },
    })

    expect(replayed(absent)).toEqual(absent)
  })

  test("the resolvers it could not reach", () => {
    const outage = attempt({ type: "unresolvable", resolvers: ["cloudflare", "quad9"] })

    expect(replayed(outage)).toEqual(outage)
  })
})
