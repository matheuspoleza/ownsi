import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "../../lib/utils.ts"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border bg-card text-muted-foreground",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        error: "bg-error-subtle text-error",
        info: "bg-info-subtle text-info",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-sm",
      },
      size: {
        sm: "h-5 px-2 text-[11px] font-medium [&_svg]:size-3",
        default: "h-[29px] py-[5px] pr-3 pl-1.5 text-[12.5px] [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "outline", shape: "pill", size: "default" },
  },
)

function Badge({
  className,
  variant,
  shape,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, shape, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
