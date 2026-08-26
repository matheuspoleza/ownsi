import { useEffect, useRef } from "react"

/** The list asks for the next batch this far before the end of it reaches the fold. */
const REACH_MARGIN = "0px 0px 320px 0px"

export interface UseScrollEndOptions {
  enabled: boolean
  onReach: () => void
}

export const useScrollEnd = ({ enabled, onReach }: UseScrollEndOptions) => {
  const end = useRef<HTMLDivElement>(null)
  const reach = useRef(onReach)

  useEffect(() => {
    reach.current = onReach
  })

  useEffect(() => {
    const element = end.current
    if (!element || !enabled) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) reach.current()
      },
      { rootMargin: REACH_MARGIN },
    )
    observer.observe(element)

    return () => observer.disconnect()
  }, [enabled])

  return end
}
