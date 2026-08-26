import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import type * as React from "react"
import { cn } from "../../lib/utils.ts"

// shadcn's disabled:pointer-events-none is deliberately absent: it stops the
// browser resolving disabled:cursor-not-allowed. Hover and press are guarded with
// not-disabled: rather than enabled:, which only matches form elements.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium outline-none transition-[color,background-color,border-color,opacity,scale] duration-200 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground not-disabled:hover:bg-primary/90 not-disabled:active:bg-primary/75",
        secondary:
          "bg-secondary text-secondary-foreground not-disabled:hover:bg-secondary/80 not-disabled:active:bg-border",
        outline:
          "border border-border bg-background text-foreground not-disabled:hover:bg-accent not-disabled:active:bg-border",
        ghost: "text-foreground not-disabled:hover:bg-accent not-disabled:active:bg-border",
        link: "text-foreground underline-offset-4 not-disabled:hover:underline not-disabled:active:opacity-70",
        destructive:
          "bg-destructive text-destructive-foreground not-disabled:hover:bg-destructive/90 not-disabled:active:bg-destructive/75",
      },
      size: {
        sm: "h-[31px] px-3 text-[13px] [&_svg]:size-4",
        default: "h-[42px] px-5 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-5",
        icon: "size-[42px] [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** The button's own glyph. Swapped for the spinner while `pending`. */
    icon?: React.ReactNode
    iconPosition?: "leading" | "trailing"
    /** Waiting on something: the label stays, the glyph spins, the button is disabled. */
    pending?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  icon,
  iconPosition = "trailing",
  pending = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  const glyph = pending ? <LoaderCircle className="animate-spin" /> : icon

  return (
    <Comp
      data-slot="button"
      disabled={disabled || pending}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {iconPosition === "leading" ? glyph : null}
          {children}
          {iconPosition === "trailing" ? glyph : null}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
