import { type PointerEvent, type RefObject, useEffect, useRef, useState } from "react"
import { useInView } from "../../../hooks/useInView.ts"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion.ts"

const ROW_LAYOUT = "(min-width: 40rem)"
const TEAR_DISTANCE = 64
const RESISTANCE = 0.34
const FLIGHT_DISTANCE = 300
const STAMP_AT_MS = 170
const UNSTAMP_AT_MS = 2100
const REATTACH_AT_MS = 2400
const HINT_PULL = 9
const HINT_AT_MS = 1050
const HINT_HOLD_MS = 560

export type TearPhase = "idle" | "hinting" | "pulling" | "torn"

export interface ProofTicketTear {
  ref: RefObject<HTMLElement | null>
  phase: TearPhase
  pull: number
  progress: number
  stamped: boolean
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
}

const after = (timers: number[], delay: number, run: () => void) => {
  timers.push(window.setTimeout(run, delay))
}

const cancel = (timers: number[]) => {
  for (const timer of timers) clearTimeout(timer)
  timers.length = 0
}

const resist = (delta: number): number => {
  if (delta <= 0) return 0
  if (delta <= TEAR_DISTANCE) return delta
  return TEAR_DISTANCE + (delta - TEAR_DISTANCE) * RESISTANCE
}

export const useProofTicketTear = (): ProofTicketTear => {
  const { ref, inView } = useInView<HTMLElement>()
  const reducedMotion = usePrefersReducedMotion()
  const [phase, setPhase] = useState<TearPhase>("idle")
  const [pull, setPull] = useState(0)
  const [stamped, setStamped] = useState(false)
  const grabbedAt = useRef(0)
  const hinted = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => cancel(timers.current), [])

  useEffect(() => {
    if (hinted.current || !inView || reducedMotion) return
    if (!window.matchMedia(ROW_LAYOUT).matches) return
    hinted.current = true

    after(timers.current, HINT_AT_MS, () => {
      setPhase("hinting")
      setPull(HINT_PULL)
    })
    after(timers.current, HINT_AT_MS + HINT_HOLD_MS, () => {
      setPhase("idle")
      setPull(0)
    })
  }, [inView, reducedMotion])

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || phase === "torn") return
    if (!window.matchMedia(ROW_LAYOUT).matches) return

    cancel(timers.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    grabbedAt.current = event.clientX - pull
    setPhase("pulling")
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (phase !== "pulling") return
    setPull(resist(event.clientX - grabbedAt.current))
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (phase !== "pulling") return
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (pull < TEAR_DISTANCE) {
      setPhase("idle")
      setPull(0)
      return
    }

    setPhase("torn")
    setPull(FLIGHT_DISTANCE)
    after(timers.current, STAMP_AT_MS, () => setStamped(true))
    after(timers.current, UNSTAMP_AT_MS, () => setStamped(false))
    after(timers.current, REATTACH_AT_MS, () => {
      setPhase("idle")
      setPull(0)
    })
  }

  return {
    ref,
    phase,
    pull,
    progress: Math.min(1, pull / TEAR_DISTANCE),
    stamped,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
