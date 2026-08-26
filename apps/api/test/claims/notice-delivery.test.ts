import { describe, expect, test } from "bun:test"
import type { ClaimAnnouncement } from "../../src/claims/domain/ports.ts"
import { bestEffort } from "../../src/claims/infra/notice-delivery.service.ts"

const ANNOUNCEMENT: ClaimAnnouncement = {
  notice: { kind: "expired" },
  claimId: "clm_1",
  userId: "usr_ada",
  domainId: "dom_1",
  domain: "acme.com",
  token: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
}

describe("a notice that cannot be delivered", () => {
  test("does not undo the act it was announcing", async () => {
    const send = bestEffort(async () => {
      throw new Error("Resend refused")
    })

    expect(await send(ANNOUNCEMENT)).toBeUndefined()
  })

  test("still lets a working transport through", async () => {
    const sent: ClaimAnnouncement[] = []
    const send = bestEffort(async (announcement) => {
      sent.push(announcement)
    })

    await send(ANNOUNCEMENT)
    expect(sent).toEqual([ANNOUNCEMENT])
  })
})
