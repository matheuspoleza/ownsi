import { cn } from "@ownsi/ui"
import type { ReactNode } from "react"
import { useInView } from "../hooks/useInView.ts"

const RISING =
  "animate-[ownsi-rise_760ms_cubic-bezier(0.33,1,0.68,1)_both] motion-reduce:animate-none"
const WAITING = "opacity-0 motion-reduce:opacity-100"

export interface RevealProps {
  children: ReactNode
  delayMs?: number
  className?: string
}

export const Reveal = ({ children, delayMs = 0, className }: RevealProps) => {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={cn(inView ? RISING : WAITING, className)}
      style={inView ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
