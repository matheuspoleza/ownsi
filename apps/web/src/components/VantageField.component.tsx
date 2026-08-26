import { cn } from "@ownsi/ui"
import { Lock } from "lucide-react"
import { useEffect, useState } from "react"
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.ts"
import { ResolverMark } from "./ResolverMark.component.tsx"
import {
  BEATS,
  GRID_SNAPPED_VANTAGES,
  HANGS_BELOW_ABOVE_Y,
  MARKER_SIZE_PX,
  type MapStory,
  RESOLVERS,
  SPEAKING_VANTAGES,
} from "./VantageField.constants.ts"
import { beatDuration, isAgreedBeat, isLockBeat, markAtBeat } from "./VantageField.utils.ts"

export interface VantageFieldProps {
  story?: MapStory
}

const markerColor = (answered: boolean, active: boolean) => {
  if (answered) return "var(--success)"
  if (active) return "var(--foreground)"
  return "color-mix(in oklab, var(--foreground) 45%, transparent)"
}

export const VantageField = ({ story = "checking" }: VantageFieldProps) => {
  const reduced = usePrefersReducedMotion()
  const [tick, setTick] = useState(0)

  const beat = tick % BEATS
  const round = Math.floor(tick / BEATS)
  const agreed = isAgreedBeat(tick)
  const locked = isLockBeat(tick, story)

  useEffect(() => {
    if (reduced) return
    const timer = setTimeout(() => setTick((current) => current + 1), beatDuration(tick, story))
    return () => clearTimeout(timer)
  }, [reduced, tick, story])

  const witnesses = RESOLVERS.map(
    (_, index) => SPEAKING_VANTAGES[(round * RESOLVERS.length + index) % SPEAKING_VANTAGES.length],
  )
  const answeredCount = agreed ? RESOLVERS.length : beat
  const activeVantage = witnesses[agreed ? RESOLVERS.length - 1 : beat]

  return (
    <div
      aria-hidden
      className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 aspect-[360/130] w-full max-w-[1440px] animate-[ownsi-fade_1800ms_cubic-bezier(0.33,1,0.68,1)_900ms_both] motion-reduce:animate-none"
    >
      {GRID_SNAPPED_VANTAGES.map((vantage, index) => {
        const witnessOf = witnesses.indexOf(index)
        const answered = !reduced && witnessOf > -1 && witnessOf < answeredCount
        const active = !reduced && index === activeVantage

        return (
          <span
            key={`${vantage.x}-${vantage.y}`}
            className="absolute"
            style={{
              left: `${vantage.x * 100}%`,
              top: `${vantage.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {active && !agreed ? (
              <span className="absolute top-1/2 left-1/2 size-[22px] animate-[ownsi-ping_2.8s_cubic-bezier(0.33,1,0.68,1)_infinite] rounded-full border border-foreground/15" />
            ) : null}

            {active && locked ? (
              <span
                key={`lock-ring-${tick}`}
                className="absolute top-1/2 left-1/2 size-[26px] animate-[ownsi-lock_1100ms_cubic-bezier(0.33,1,0.68,1)_forwards] rounded-full border border-success/40"
              />
            ) : null}

            <span
              className="block rounded-full transition-colors duration-1000"
              style={{
                width: MARKER_SIZE_PX,
                height: MARKER_SIZE_PX,
                backgroundColor: markerColor(answered, active),
                animation:
                  answered || active || reduced
                    ? undefined
                    : `ownsi-breathe 6s ease-in-out ${index * 0.6}s infinite`,
              }}
            />

            {active ? (
              <span
                className={cn(
                  "-translate-x-1/2 absolute left-1/2 flex",
                  vantage.y < HANGS_BELOW_ABOVE_Y ? "top-full mt-3" : "bottom-full mb-3",
                )}
              >
                {locked ? (
                  <Lock
                    key={`lock-${tick}`}
                    className="size-4 text-foreground"
                    strokeWidth={2}
                    style={{ animation: "ownsi-seal 640ms cubic-bezier(0.33,1,0.68,1) both" }}
                  />
                ) : (
                  <ResolverMark
                    key={`mark-${tick}`}
                    id={markAtBeat(beat)}
                    className="size-4"
                    style={{ animation: "ownsi-chip 620ms cubic-bezier(0.33,1,0.68,1) both" }}
                  />
                )}
              </span>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}
