import { type RefObject, useEffect, useRef } from "react"
import { normalizeDomain } from "../lib/domain.utils.ts"
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.ts"

const EYE = { x: 61.261, y: 30.612 }
const CHEST_BASE = { x: 66.212, y: 81.206 }

const CARET_REACH_CHARS = 18

const BODY_LEAN_DEG = 3.5
const BODY_RANGE_DEG = 6
const BODY_KICK = 9

const MOUTH_RANGE = 1.4
const MOUTH_KICK = 11

const BLINK_MS = 120
const BLINK_DEBOUNCE_MS = 210
const BLINK_GAP_MS = 2600
const BLINK_SPREAD_MS = 3600

const BREATH_AMPLITUDE = 0.02
const BREATH_PERIOD_MS = 3400

const SETTLED = 0.01
const MAX_FRAME_MS = 48

interface Joint {
  value: number
  velocity: number
  target: number
  stiffness: number
  damping: number
  /** How far this joint travels before it stops. */
  range: number
}

const joint = (stiffness: number, damping: number, range: number): Joint => ({
  value: 0,
  velocity: 0,
  target: 0,
  stiffness,
  damping,
  range,
})

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value))

const advance = (spring: Joint, seconds: number) => {
  spring.target = clamp(spring.target, spring.range)
  spring.velocity += (spring.target - spring.value) * spring.stiffness * seconds
  spring.velocity *= Math.exp(-spring.damping * seconds)

  const reached = spring.value + spring.velocity * seconds
  const stopped = clamp(reached, spring.range)
  if (stopped !== reached) spring.velocity = 0
  spring.value = stopped
}

const isResting = (spring: Joint) =>
  Math.abs(spring.velocity) < SETTLED && Math.abs(spring.target - spring.value) < SETTLED

const squash = (factor: number, pivot: { x: number; y: number }) =>
  `translate(${pivot.x} ${pivot.y}) scale(1 ${factor.toFixed(4)}) translate(${-pivot.x} ${-pivot.y})`

export const useSentinelRig = (typed: string): RefObject<SVGSVGElement | null> => {
  const glyph = useRef<SVGSVGElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  const body = useRef(joint(150, 10, BODY_RANGE_DEG))
  const mouth = useRef(joint(260, 12, MOUTH_RANGE))
  const blinkStartedAt = useRef<number | null>(null)
  const breathPhase = useRef(0)
  const breathRate = useRef(0)
  const frame = useRef(0)
  const lastFrameAt = useRef(0)
  const wake = useRef(() => {})

  useEffect(() => {
    if (reducedMotion) return
    const root = glyph.current
    if (!root) return

    const part = (name: string) => root.querySelector(`[data-part="${name}"]`)
    const mouthPart = part("muzzle")
    const eyePart = part("eye")
    const chestPart = part("chest")

    const draw = (now: number) => {
      const seconds = Math.min(MAX_FRAME_MS, now - (lastFrameAt.current || now)) / 1000
      lastFrameAt.current = now

      advance(body.current, seconds)
      advance(mouth.current, seconds)

      root.style.rotate = `${body.current.value.toFixed(3)}deg`
      mouthPart?.setAttribute("transform", `translate(0 ${mouth.current.value.toFixed(3)})`)

      const startedAt = blinkStartedAt.current
      if (startedAt !== null) {
        const through = (now - startedAt) / BLINK_MS
        if (through >= 1) {
          blinkStartedAt.current = null
          eyePart?.removeAttribute("transform")
        } else {
          eyePart?.setAttribute("transform", squash(1 - Math.sin(through * Math.PI) * 0.92, EYE))
        }
      }

      if (breathRate.current > 0) {
        breathPhase.current +=
          (seconds * 1000 * breathRate.current * 2 * Math.PI) / BREATH_PERIOD_MS
        chestPart?.setAttribute(
          "transform",
          squash(1 + Math.sin(breathPhase.current) * BREATH_AMPLITUDE, CHEST_BASE),
        )
      } else if (chestPart?.hasAttribute("transform")) {
        breathPhase.current = 0
        chestPart.removeAttribute("transform")
      }

      const busy =
        !isResting(body.current) ||
        !isResting(mouth.current) ||
        blinkStartedAt.current !== null ||
        breathRate.current > 0

      frame.current = busy ? requestAnimationFrame(draw) : 0
    }

    wake.current = () => {
      if (frame.current !== 0) return
      lastFrameAt.current = 0
      frame.current = requestAnimationFrame(draw)
    }

    let blinkTimer = 0
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(
        () => {
          blinkStartedAt.current = performance.now()
          wake.current()
          scheduleBlink()
        },
        BLINK_GAP_MS + Math.random() * BLINK_SPREAD_MS,
      )
    }
    scheduleBlink()
    wake.current()

    return () => {
      clearTimeout(blinkTimer)
      if (frame.current !== 0) cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [reducedMotion])

  const lastBlinkAt = useRef(0)

  useEffect(() => {
    if (reducedMotion) return

    const reach = Math.min(1, typed.length / CARET_REACH_CHARS)
    const sighted = normalizeDomain(typed) !== null
    const now = performance.now()

    body.current.target = sighted ? 0 : -reach * BODY_LEAN_DEG
    body.current.velocity -= BODY_KICK
    mouth.current.velocity += MOUTH_KICK
    breathRate.current = typed.length === 0 ? 0 : 1 + reach * 1.6

    if (now - lastBlinkAt.current > BLINK_DEBOUNCE_MS) {
      lastBlinkAt.current = now
      blinkStartedAt.current = now
    }

    wake.current()
  }, [typed, reducedMotion])

  return glyph
}
