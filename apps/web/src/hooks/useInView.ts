import { useEffect, useRef, useState } from "react"

const ENTER_MARGIN = "0px 0px -12% 0px"

export const useInView = <Element extends HTMLElement>() => {
  const ref = useRef<Element>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true)
      },
      { rootMargin: ENTER_MARGIN },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, inView }
}
