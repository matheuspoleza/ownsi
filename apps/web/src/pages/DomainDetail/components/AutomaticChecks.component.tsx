import type { Verification } from "../../../api/verification.api.ts"
import { formatDuration, secondsSince, secondsUntil } from "../../../lib/time.utils.ts"

const NOTHING_SCHEDULED = "nothing scheduled"

const nextCheckIn = (verification: Verification | null, now: number) => {
  if (verification === null || verification.nextRunAt === null) return NOTHING_SCHEDULED

  const remaining = secondsUntil(verification.nextRunAt, now)
  return remaining === 0 ? "running now" : `in ${formatDuration(remaining)}`
}

/** How far the wait to the next read has run, so the bar moves rather than guesses. */
const elapsedShare = (verification: Verification | null, now: number) => {
  const { lastRunAt = null, nextRunAt = null, createdAt } = verification ?? {}
  if (!nextRunAt || !createdAt) return 0

  const from = lastRunAt ?? createdAt
  const span = secondsUntil(nextRunAt, new Date(from).getTime())
  if (span === 0) return 1

  return Math.min(1, secondsSince(from, now) / span)
}

export interface AutomaticChecksProps {
  verification: Verification | null
  now: number
}

export const AutomaticChecks = ({ verification, now }: AutomaticChecksProps) => (
  <section className="flex flex-col gap-3 pb-[26px]">
    <h2 className="font-semibold text-[13px] text-foreground">Automatic checks</h2>

    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">Next check</span>
        <span className="font-mono text-[13px] text-foreground">
          {nextCheckIn(verification, now)}
        </span>
      </div>

      <span className="h-[3px] w-full overflow-hidden rounded-full bg-border">
        <span
          className="block h-full rounded-full bg-foreground transition-[width] duration-1000 ease-linear"
          style={{ width: `${Math.round(elapsedShare(verification, now) * 100)}%` }}
        />
      </span>
    </div>
  </section>
)
