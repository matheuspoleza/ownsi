import { Button, cn } from "@ownsi/ui"
import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  Copy,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import type { Diagnosis } from "../../../api/verification.api.ts"
import type { Tone } from "../DomainDetail.constants.ts"
import { DIAGNOSTICS_URL } from "../DomainDetail.constants.ts"
import { useCopy } from "../hooks/useCopy.ts"

const BAND_TONES: Record<Tone, string> = {
  idle: "bg-muted/40",
  running: "bg-muted/40",
  success: "bg-success-subtle",
  warning: "bg-warning-subtle",
  error: "bg-error-subtle",
}

const ICON_TONES: Record<Tone, string> = {
  idle: "text-muted-foreground",
  running: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
}

const GLYPHS: Record<Tone, typeof CircleCheck> = {
  idle: CircleDashed,
  running: LoaderCircle,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
}

interface CopyRecordButtonProps {
  value: string
}

const CopyRecordButton = ({ value }: CopyRecordButtonProps) => {
  const { copied, copy } = useCopy(value)

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="text-success" /> : <Copy />}
      Copy record
    </Button>
  )
}

export interface VerificationMessageProps {
  tone: Tone
  headline: string
  body: string
  diagnosis: Diagnosis | null
  /** The value the fix asks the person to paste, when there is one. */
  recordValue: string | null
}

export const VerificationMessage = ({
  tone,
  headline,
  body,
  diagnosis,
  recordValue,
}: VerificationMessageProps) => {
  const [showsEvidence, setShowsEvidence] = useState(false)
  const Glyph = GLYPHS[tone]

  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 border-border border-t px-[18px] py-4",
        BAND_TONES[tone],
      )}
    >
      <div className="flex items-start gap-3">
        <Glyph
          className={cn(
            "mt-px size-[17px] shrink-0",
            ICON_TONES[tone],
            tone === "running" ? "animate-spin" : "",
          )}
          strokeWidth={1.75}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="font-medium text-[13.5px] text-foreground leading-[1.45]">{headline}</p>
          <p className="text-[13px] text-muted-foreground leading-[1.5]">{body}</p>
        </div>

        {diagnosis ? (
          <button
            type="button"
            onClick={() => setShowsEvidence((shown) => !shown)}
            aria-expanded={showsEvidence}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Evidence
            <ChevronDown
              className={cn("size-3.5 transition-transform", showsEvidence ? "rotate-180" : "")}
            />
          </button>
        ) : null}
      </div>

      {showsEvidence && diagnosis ? (
        <div className="flex flex-col gap-2 border-border border-t pt-3">
          <a
            href={`${DIAGNOSTICS_URL}#${diagnosis.code}`}
            target="_blank"
            rel="noreferrer"
            className="w-fit font-mono text-[11.5px] text-muted-foreground underline-offset-4 hover:underline"
          >
            {diagnosis.code}
          </a>
          <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-[11.5px] text-muted-foreground">
            {JSON.stringify(diagnosis.observed, null, 2)}
          </pre>
        </div>
      ) : null}

      {recordValue ? (
        <div className="flex pl-[29px]">
          <CopyRecordButton value={recordValue} />
        </div>
      ) : null}
    </div>
  )
}
