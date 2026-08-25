import { cn } from "@ownsi/ui"
import { Check, FileText, Lock, Server, X } from "lucide-react"
import type { ComponentProps } from "react"
import type { Tone } from "../DomainDetail.constants.ts"

const MARKERS = [Server, FileText, Lock] as const

const CHIP_TONES: Record<Tone, string> = {
  idle: "border-border text-muted-foreground",
  running: "border-border text-foreground",
  success: "border-success/50 text-success",
  warning: "border-warning/50 text-warning",
  error: "border-error/50 text-error",
}

const BADGE_TONES: Record<Tone, string> = {
  idle: "bg-border",
  running: "bg-foreground",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
}

const Marker = ({ index, ...props }: { index: number } & ComponentProps<"svg">) => {
  const Glyph = MARKERS[index] ?? Server
  return <Glyph {...props} />
}

export interface CheckStepProps {
  index: number
  label: string
  tone: Tone
  /** Tinted rather than neutral — the step the current state is actually about. */
  emphasised: boolean
  last: boolean
}

export const CheckStep = ({ index, label, tone, emphasised, last }: CheckStepProps) => {
  const settled = tone === "success" || tone === "error"

  return (
    <div className={cn("flex flex-col gap-3", last ? "shrink-0" : "flex-1")}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-[10px] border bg-background",
            emphasised ? CHIP_TONES[tone] : "border-border",
          )}
        >
          <Marker
            index={index}
            className={cn(
              "size-4",
              tone === "idle" ? "text-muted-foreground" : "text-foreground",
              tone === "running" ? "animate-pulse" : "",
            )}
            strokeWidth={1.75}
          />
          {settled ? (
            <span className="-right-[5px] -bottom-[5px] absolute flex size-[17px] items-center justify-center rounded-full bg-background">
              <span
                className={cn(
                  "flex size-[13px] items-center justify-center rounded-full",
                  emphasised ? BADGE_TONES[tone] : "bg-foreground",
                )}
              >
                {tone === "error" ? (
                  <X className="size-2 text-background" strokeWidth={4} />
                ) : (
                  <Check className="size-2 text-background" strokeWidth={4} />
                )}
              </span>
            </span>
          ) : null}
        </span>

        {last ? null : <span className="h-px flex-1 bg-border" />}
      </div>

      <span
        className={cn(
          "w-fit rounded-md border bg-background px-2.5 py-1 font-medium text-[13px]",
          emphasised ? CHIP_TONES[tone] : "border-border text-foreground",
        )}
      >
        {label}
      </span>
    </div>
  )
}
