import { describe, expect, test } from "bun:test"
import type { EventBus } from "../../src/shared/bus.ts"
import { inProcessBus } from "../../src/shared/bus.ts"
import { daysAfter, secondsAfter } from "../../src/shared/time.ts"
import { runVerification } from "../../src/verification/application/run-verification.use-case.ts"
import type { AttemptOutcome, CheckChallenge } from "../../src/verification/domain/attempt.ts"
import { start } from "../../src/verification/domain/verification.ts"
import type { VerificationEvent } from "../../src/verification/verification.contract.ts"
import { inMemoryVerificationRepository } from "./in-memory-verification-repository.ts"

const NOW = new Date("2026-08-24T12:00:00Z")

const RUNNING = start({
  id: "vrf_1",
  subjectId: "clm_1",
  ownerId: "usr_ada",
  method: "dns_txt",
  challenge: { domain: "acme.com", token: "ownsi_v1_token", previousTokens: ["ownsi_v1_old"] },
  deadline: daysAfter(NOW, 7),
  startedAt: NOW,
})

const NOT_PUBLISHED: AttemptOutcome = {
  type: "absent",
  diagnosis: { code: "not_published", observed: { nameservers: ["kate.ns.cloudflare.com"] } },
}

function runner(outcome: AttemptOutcome, at = secondsAfter(NOW, 30)) {
  const verifications = inMemoryVerificationRepository([RUNNING])
  const bus: EventBus<VerificationEvent> = inProcessBus()
  const published: string[] = []
  const asked: Parameters<CheckChallenge>[] = []

  for (const name of [
    "verification/attempt.succeeded",
    "verification/attempt.failed",
    "verification/exhausted",
  ] as const) {
    bus.on(name, async () => {
      published.push(name)
    })
  }

  const run = runVerification({
    verifications,
    checkChallenge: async (method, challenge) => {
      asked.push([method, challenge])
      return outcome
    },
    publish: bus.publish,
    generateId: (prefix) => `${prefix}_1`,
    clock: () => at,
  })

  return { run, verifications, published, asked }
}

describe("running one check", () => {
  test("the token being there proves the process and says so once", async () => {
    const app = runner({ type: "found", value: "ownsi_v1_token" })
    const ran = await app.run({ verificationId: "vrf_1", trigger: "requested" })

    expect(ran.ok && ran.value.status).toBe("proved")
    expect(app.published).toEqual(["verification/attempt.succeeded"])
  })

  test("the check is asked for the live token and every token it has retired", async () => {
    const app = runner(NOT_PUBLISHED)
    await app.run({ verificationId: "vrf_1", trigger: "requested" })

    expect(app.asked).toEqual([
      [
        "dns_txt",
        { domain: "acme.com", token: "ownsi_v1_token", previousTokens: ["ownsi_v1_old"] },
      ],
    ])
  })

  test("an absent record carries the diagnosis and the moment it was last looked at", async () => {
    const app = runner(NOT_PUBLISHED)
    await app.run({ verificationId: "vrf_1", trigger: "scheduled" })

    expect(app.published).toEqual(["verification/attempt.failed"])
  })

  test("a resolver outage records the attempt and publishes nothing at all", async () => {
    const app = runner({ type: "unresolvable", resolvers: ["cloudflare"] })
    const ran = await app.run({ verificationId: "vrf_1", trigger: "scheduled" })

    expect(app.published).toEqual([])
    expect(ran.ok && ran.value.consecutiveFailures).toBe(1)
    expect(app.verifications.attempts()).toHaveLength(1)
  })

  test("every run leaves a row behind, whatever it found", async () => {
    const app = runner({ type: "found", value: "ownsi_v1_token" })
    await app.run({ verificationId: "vrf_1", trigger: "first_check" })

    expect(app.verifications.attempts()).toEqual([
      {
        id: "att_1",
        verificationId: "vrf_1",
        trigger: "first_check",
        outcome: { type: "found", value: "ownsi_v1_token" },
        latencyMs: 0,
        at: secondsAfter(NOW, 30),
      },
    ])
  })

  test("waking past the deadline gives up instead of reading DNS", async () => {
    const app = runner(NOT_PUBLISHED, daysAfter(NOW, 7))
    const ran = await app.run({ verificationId: "vrf_1", trigger: "scheduled" })

    expect(ran.ok && ran.value.status).toBe("exhausted")
    expect(app.asked).toEqual([])
    expect(app.published).toEqual(["verification/exhausted"])
  })

  test("a process that has finished is never run again", async () => {
    const app = runner({ type: "found", value: "ownsi_v1_token" })
    await app.run({ verificationId: "vrf_1", trigger: "requested" })
    const again = await app.run({ verificationId: "vrf_1", trigger: "requested" })

    expect(again).toMatchObject({ ok: false, error: { type: "not_running" } })
  })

  test("a verification nobody started is not one to run", async () => {
    const app = runner(NOT_PUBLISHED)

    expect(await app.run({ verificationId: "vrf_nothing", trigger: "requested" })).toMatchObject({
      ok: false,
      error: { type: "not_found" },
    })
  })
})
