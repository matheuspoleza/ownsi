import { useEffect, useRef } from "react"

export const useAutoFocus = <Element extends HTMLElement>() => {
  const ref = useRef<Element>(null)

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  return ref
}
