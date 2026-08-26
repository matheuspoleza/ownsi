import type * as React from "react"
import { cn } from "../lib/utils.ts"
import { OwnsiSeal } from "./seal.tsx"

export function OwnsiLogo({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex items-center gap-[6px]", className)} {...props}>
      <OwnsiSeal className="h-[26px] w-[23px] text-foreground" />
      <span className="font-semibold text-[17px] text-foreground tracking-[-0.4px]">ownsi</span>
    </span>
  )
}
