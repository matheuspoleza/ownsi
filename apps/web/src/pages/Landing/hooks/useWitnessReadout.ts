import { type RefObject, useEffect, useState } from "react"
import { useInView } from "../../../hooks/useInView.ts"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion.ts"

const FIRST_ANSWER_MS = 620
const BETWEEN_ANSWERS_MS = 380

export interface WitnessReadout {
  ref: RefObject<HTMLDivElement | null>
  /** How many resolvers have answered. The next one down is the one being asked. */
  answered: number
}

export const useWitnessReadout = (asked: number): WitnessReadout => {
  const { ref, inView } = useInView<HTMLDivElement>()
  const reducedMotion = usePrefersReducedMotion()
  const [answered, setAnswered] = useState(0)

  useEffect(() => {
    if (!inView) return

    if (reducedMotion) {
      setAnswered(asked)
      return
    }

    const timers = Array.from({ length: asked }, (_, index) =>
      window.setTimeout(() => setAnswered(index + 1), FIRST_ANSWER_MS + index * BETWEEN_ANSWERS_MS),
    )

    return () => {
      for (const timer of timers) clearTimeout(timer)
    }
  }, [inView, reducedMotion, asked])

  return { ref, answered }
}
