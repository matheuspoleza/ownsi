import type * as React from "react"
import { cn } from "../lib/utils.ts"
import { OwnsiMark } from "./mark.tsx"

export function OwnsiLogo({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex items-center gap-[5px]", className)} {...props}>
      <OwnsiMark className="h-7 w-5 text-foreground" />
      <span className="font-semibold text-[17px] text-foreground tracking-[-0.4px]">ownsi</span>
    </span>
  )
}
