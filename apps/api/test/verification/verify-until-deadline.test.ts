import { describe, expect, test } from "bun:test"
import { inProcessBus } from "../../src/shared/bus.ts"
import { daysAfter } from "../../src/shared/time.ts"
import { runVerification } from "../../src/verification/application/run-verification.use-case.ts"
import { verifyUntilDeadline } from "../../src/verification/application/verify-until-deadline.schedule.ts"
import type { AttemptOutcome, AttemptTrigger } from "../../src/verification/domain/attempt.ts"
import type { Step } from "../../src/verification/domain/ports.ts"
import { start } from "../../src/verification/domain/verification.ts"
import type { VerificationEvent } from "../../src/verification/verification.contract.ts"
import { inMemoryVerificationRepository } from "./in-memory-verification-repository.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

function loop(outcome: AttemptOutcome) {
  let now = NOW
  const slept: Date[] = []
  const triggers: AttemptTrigger[] = []

  const verifications = inMemoryVerificationRepository([
    start({
      id: "vrf_1",
      subjectId: "clm_1",
      ownerId: "usr_ada",
      method: "dns_txt",
      challenge: { domain: "acme.com", token: "ownsi_v1_token", previousTokens: [] },
      deadline: daysAfter(NOW, 7),
      startedAt: NOW,
    }),
  ])

  const step: Step = {
    run: (_id, body) => body(),
    sleepUntil: async (_id, at) => {
      slept.push(at)
      now = at
    },
  }

  const bus = inProcessBus<VerificationEvent>()

  const verify = verifyUntilDeadline({
    verifications,
    runVerification: (input) => {
      triggers.push(input.trigger)
      return runVerification({
        verifications,
        checkChallenge: async () => outcome,
        publish: bus.publish,
        generateId: (prefix) => `${prefix}_${triggers.length}`,
        clock: () => now,
      })(input)
    },
  })

  return { verify, step, slept, triggers, verifications }
}

describe("the seven-day window, against a step that returns at once", () => {
  test("the loop ends when the record appears, and it ran exactly once", async () => {
    const app = loop({ type: "found", value: "ownsi_v1_token" })
    await app.verify({ verificationId: "vrf_1" }, app.step)

    expect(app.triggers).toEqual(["first_check"])
    expect(app.verifications.all()[0]?.status).toBe("proved")
  })

  test("a record nobody publishes is asked for until the deadline, then given up on", async () => {
    const app = loop(NOT_PUBLISHED)
    await app.verify({ verificationId: "vrf_1" }, app.step)

    expect(app.verifications.all()[0]).toMatchObject({ status: "exhausted", nextRunAt: null })
    expect(app.slept[0]).toEqual(new Date(NOW.getTime() + 30_000))
    expect(app.slept.at(-1)).toEqual(daysAfter(NOW, 7))
    expect(app.triggers[0]).toBe("first_check")
    expect(app.triggers.slice(1).every((trigger) => trigger === "scheduled")).toBe(true)
  })

  test("the whole window costs about sixty reads, not one a minute", async () => {
    const app = loop(NOT_PUBLISHED)
    await app.verify({ verificationId: "vrf_1" }, app.step)

    expect(app.triggers.length).toBeGreaterThan(30)
    expect(app.triggers.length).toBeLessThan(100)
  })

  test("a verification that was stopped while the step slept wakes to nothing", async () => {
    const app = loop(NOT_PUBLISHED)
    await app.verifications.save({
      ...(app.verifications.all()[0] ??
        (() => {
          throw new Error("no fixture")
        })()),
      status: "stopped",
      nextRunAt: null,
    })

    await app.verify({ verificationId: "vrf_1" }, app.step)

    expect(app.triggers).toEqual([])
  })
})
