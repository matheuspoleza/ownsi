import { AnimateIcon, Button, cn } from "@ownsi/ui"
import { CornerDownLeft } from "lucide-react"
import type { KeyboardEvent, ReactNode } from "react"
import { useState } from "react"
import { useAutoFocus } from "../hooks/useAutoFocus.ts"
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.ts"

const SUBMIT_BEAT_MS = 1500
const INK_HEIGHT = "h-[38px]"
const INK_BOX = `pointer-events-none absolute inset-x-[7px] top-1/2 -translate-y-1/2 ${INK_HEIGHT}`
const INK_EASING = "cubic-bezier(0.65, 0, 0.35, 1)"
const INK_CLOSED = "inset(0 100% 0 0 round 6px)"
const INK_OPEN = "inset(0 0 0 0 round 6px)"

export interface FieldBarProps {
  value: string
  onValueChange: (value: string) => void
  /** Runs once the ink has swept the bar, so the beat is the same everywhere. */
  onSubmit: () => void
  /** Nothing typed here is submittable yet. */
  ready: boolean
  /** Sits at the head of the bar and turns as the ink passes under it. */
  icon: ReactNode
  submitLabel: string
  placeholder: string
  /** What a screen reader calls the field. */
  label: string
  type?: "text" | "email"
  autoComplete?: string
  /** The caller is still working on what was typed here. */
  pending?: boolean
  /** What was typed here came back refused. */
  invalid?: boolean
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  describedBy?: string
  /** A popover the field owns, hung under the bar. */
  children?: ReactNode
}

export const FieldBar = ({
  value,
  onValueChange,
  onSubmit,
  ready,
  icon,
  submitLabel,
  placeholder,
  label,
  type = "text",
  autoComplete = "off",
  pending = false,
  invalid = false,
  onKeyDown,
  describedBy,
  children,
}: FieldBarProps) => {
  const [submitting, setSubmitting] = useState(false)
  const field = useAutoFocus<HTMLInputElement>()
  const reducedMotion = usePrefersReducedMotion()

  const committing = submitting || pending

  const ink = {
    clipPath: committing ? INK_OPEN : INK_CLOSED,
    transitionProperty: "clip-path",
    transitionDuration: reducedMotion ? "0ms" : `${SUBMIT_BEAT_MS}ms`,
    transitionTimingFunction: INK_EASING,
  }

  return (
    <form
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault()
        if (!ready || submitting) return

        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          onSubmit()
        }, SUBMIT_BEAT_MS)
      }}
    >
      <AnimateIcon asChild animateOnHover>
        <div
          className={cn(
            "relative flex h-[52px] w-full items-center rounded-md border border-input bg-background transition-colors",
            "focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground",
            invalid && "border-error",
          )}
        >
          <span aria-hidden className={cn(INK_BOX, "z-20 rounded-sm bg-primary")} style={ink} />

          <span
            aria-hidden
            className={cn(
              INK_BOX,
              "z-30 flex items-center overflow-hidden whitespace-pre pl-[35px] font-mono text-[14px] text-primary-foreground",
            )}
            style={ink}
          >
            {value}
          </span>

          <span
            aria-hidden
            className={cn(
              "relative z-40 flex w-[42px] shrink-0 items-center justify-center transition-colors",
              committing ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {icon}
          </span>

          <input
            ref={field}
            type={type}
            value={value}
            readOnly={committing}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={label}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            autoComplete={autoComplete}
            spellCheck={false}
            className="relative z-10 h-full min-w-0 flex-1 bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />

          <AnimateIcon asChild animateOnHover>
            <Button
              type="submit"
              disabled={!ready}
              pending={committing}
              icon={<CornerDownLeft />}
              className={cn(
                INK_HEIGHT,
                "relative z-40 mr-[7px] shrink-0 font-mono lowercase",
                !ready && "scale-[0.97]",
              )}
            >
              {submitLabel}
            </Button>
          </AnimateIcon>
        </div>
      </AnimateIcon>

      {children}
    </form>
  )
}
