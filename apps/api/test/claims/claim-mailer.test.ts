import { describe, expect, test } from "bun:test"
import type { ClaimNotice } from "../../src/claims/domain/notice.ts"
import type { ClaimAnnouncement } from "../../src/claims/domain/ports.ts"
import { emailTheClaimant } from "../../src/claims/infra/claim-mailer.service.ts"
import type { EmailMessage } from "../../src/shared/email.ts"

const TOKEN = "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058"

const APEX: ClaimNotice = {
  kind: "nudge",
  diagnosis: { code: "record_at_apex", observed: { name: "acme.com", value: TOKEN } },
}

const announcement = (notice: ClaimNotice): ClaimAnnouncement => ({
  notice,
  claimId: "clm_1",
  userId: "usr_ada",
  domainId: "dom_1",
  domain: "acme.com",
  token: TOKEN,
})

function mailer(email: string | null = "ada@example.com") {
  const outbox: EmailMessage[] = []

  const sendNotice = emailTheClaimant({
    sendEmail: async (message) => {
      outbox.push(message)
    },
    findRecipient: async () => (email === null ? null : { email, name: "Ada" }),
    appUrl: "https://ownsi.dev",
  })

  return { sendNotice, outbox }
}

describe("what lands in the claimant's inbox", () => {
  test("a nudge names the failure and the record to fix, in the diagnosis' own words", async () => {
    const app = mailer()
    await app.sendNotice(announcement(APEX))

    const [sent] = app.outbox
    expect(sent?.to).toBe("ada@example.com")
    expect(sent?.subject).toBe("acme.com is still waiting on one record")
    expect(sent?.text).toContain("_ownsi-challenge.acme.com")
    expect(sent?.text).toContain(TOKEN)
  })

  test("the day-six warning says the window closes tomorrow", async () => {
    const app = mailer()
    await app.sendNotice(announcement({ kind: "expiring", diagnosis: APEX.diagnosis }))

    expect(app.outbox[0]?.subject).toBe("The window on acme.com closes tomorrow")
    expect(app.outbox[0]?.text).toContain("a new token")
  })

  test("the proof email carries the date the proof is dated by, in words", async () => {
    const app = mailer()
    await app.sendNotice(
      announcement({
        kind: "proved",
        provedAt: new Date("2026-08-24T12:00:00Z"),
        proofUrl: "https://ownsi.dev/p/9f3a1c7d",
      }),
    )

    expect(app.outbox[0]?.subject).toBe("acme.com is proved")
    expect(app.outbox[0]?.text).toContain("24 August 2026")
    expect(app.outbox[0]?.text).toContain("https://ownsi.dev/p/9f3a1c7d")
  })

  test("a proof nobody could publish a link for still says the claim is proved", async () => {
    const app = mailer()
    await app.sendNotice(
      announcement({
        kind: "proved",
        provedAt: new Date("2026-08-24T12:00:00Z"),
        proofUrl: null,
      }),
    )

    expect(app.outbox[0]?.text).toContain("24 August 2026")
    expect(app.outbox[0]?.text).not.toContain("no account needed")
  })

  test("the coexistence email says the other proof takes nothing away", async () => {
    const app = mailer()
    await app.sendNotice(announcement({ kind: "coexistence" }))

    expect(app.outbox[0]?.subject).toBe("Another account proved acme.com")
    expect(app.outbox[0]?.text).toContain("Your own claim is untouched")
  })

  test("a changed answer names the new reading, not the one that is gone", async () => {
    const app = mailer()
    await app.sendNotice(
      announcement({
        kind: "progress",
        diagnosis: { code: "negative_cache", observed: { secondsRemaining: 240 } },
      }),
    )

    const [sent] = app.outbox
    expect(sent?.subject).toBe("What changed at acme.com")
    expect(sent?.text).toContain("Nothing to do")
    expect(sent?.text).not.toContain("still waiting")
  })

  test("the closed window says the record is still in the right place", async () => {
    const app = mailer()
    await app.sendNotice(announcement({ kind: "expired" }))

    const [sent] = app.outbox
    expect(sent?.subject).toBe("The window on acme.com closed")
    expect(sent?.text).toContain("one edit to its value")
  })

  test("a recipient we cannot find is not an error, and sends nothing", async () => {
    const app = mailer(null)
    await app.sendNotice(announcement(APEX))

    expect(app.outbox).toEqual([])
  })

  test("every email links back to the domain it is about", async () => {
    const app = mailer()
    await app.sendNotice(announcement(APEX))

    expect(app.outbox[0]?.html).toContain("https://ownsi.dev/domains/dom_1")
  })
})
