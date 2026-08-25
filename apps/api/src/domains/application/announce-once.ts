import type { Clock } from "../../shared/clock.ts"
import type { AnnounceClaim, SentNotices } from "../domain/ports.ts"

export type AnnounceOnceDeps = {
  readonly announce: AnnounceClaim
  readonly sent: SentNotices
  readonly clock: Clock
}

const CEILING_HOURS = 24
const MILLISECONDS_IN_HOUR = 3_600_000

export function announceOncePerDay(deps: AnnounceOnceDeps): AnnounceClaim {
  return async (announcement) => {
    const now = deps.clock()
    const { claimId, notice } = announcement
    const last = await deps.sent.lastSent(claimId, notice.kind)
    if (last !== null && hoursBetween(last, now) < CEILING_HOURS) return

    await deps.announce(announcement)
    await deps.sent.record(claimId, notice.kind, now)
  }
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MILLISECONDS_IN_HOUR
}
