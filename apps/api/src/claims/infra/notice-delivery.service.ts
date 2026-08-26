import type { SendNotice } from "../domain/ports.ts"

export function bestEffort(sendNotice: SendNotice): SendNotice {
  return async (announcement) => {
    try {
      await sendNotice(announcement)
    } catch (cause) {
      console.error(
        `notice ${announcement.notice.kind} for claim ${announcement.claimId} was not sent`,
        cause,
      )
    }
  }
}
