import { cn } from "@ownsi/ui"
import type { Diagnosis } from "../../../api/verification.api.ts"
import type { Tone } from "../DomainDetail.constants.ts"
import type { Step } from "../DomainDetail.utils.ts"
import { CheckStep } from "./CheckStep.component.tsx"
import { VerificationMessage } from "./VerificationMessage.component.tsx"

const DOT_GRID = "radial-gradient(var(--border) 1px, transparent 1px) 3px 3px / 18px 18px"

const CARD_TONES: Record<Tone, string> = {
  idle: "border-border",
  running: "border-border",
  success: "border-success/45",
  warning: "border-warning/45",
  error: "border-error/45",
}

export interface OwnershipVerificationProps {
  steps: readonly Step[]
  tone: Tone
  headline: string
  body: string
  diagnosis: Diagnosis | null
  recordValue: string | null
}

export const OwnershipVerification = ({
  steps,
  tone,
  headline,
  body,
  diagnosis,
  recordValue,
}: OwnershipVerificationProps) => (
  <section className="flex flex-col gap-3.5">
    <h2 className="font-semibold text-[13px] text-foreground">Ownership verification</h2>

    <div className={cn("overflow-hidden rounded-lg border bg-card", CARD_TONES[tone])}>
      <div className="flex h-[158px] items-center px-5" style={{ background: DOT_GRID }}>
        <div className="flex w-full items-start">
          {steps.map((step, index) => (
            <CheckStep
              key={step.label}
              index={index}
              label={step.label}
              tone={step.tone}
              emphasised={
                step.tone === "error" || (index === steps.length - 1 && step.tone === "success")
              }
              last={index === steps.length - 1}
            />
          ))}
        </div>
      </div>

      <VerificationMessage
        tone={tone}
        headline={headline}
        body={body}
        diagnosis={diagnosis}
        recordValue={recordValue}
      />
    </div>
  </section>
)
