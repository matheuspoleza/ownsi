import type * as React from "react"
import { cn } from "../../lib/utils.ts"

function ArrowRightIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-4", className)}
      {...props}
    >
      <g className="transition-transform duration-200 ease-out group-hover/button:translate-x-[2px] motion-reduce:transition-none">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </g>
    </svg>
  )
}

export { ArrowRightIcon }
