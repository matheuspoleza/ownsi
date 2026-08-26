import type * as React from "react"
import { cn } from "../../lib/utils.ts"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[42px] w-full min-w-0 rounded-md border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-error",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
