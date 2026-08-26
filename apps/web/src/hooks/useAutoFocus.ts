import { type RefObject, useEffect, useRef } from "react"

export const useAutoFocus = <Element extends HTMLElement>(given?: RefObject<Element | null>) => {
  const own = useRef<Element>(null)
  const ref = given ?? own

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [ref])

  return ref
}
