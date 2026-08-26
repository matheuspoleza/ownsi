import { cn } from "@ownsi/ui"
import { Check, Circle, LoaderCircle } from "lucide-react"
import { ResolverMark } from "../../../components/ResolverMark.component.tsx"
import { useWitnessReadout } from "../hooks/useWitnessReadout.ts"
import type { Witness } from "../Landing.constants.ts"

type RowState = "waiting" | "asking" | "answered"

const rowState = (index: number, answered: number): RowState => {
  if (index < answered) return "answered"
  return index === answered ? "asking" : "waiting"
}

const MARK_OPACITY: Record<RowState, string> = {
  waiting: "opacity-20",
  asking: "opacity-40",
  answered: "opacity-100",
}

interface RowStatusProps {
  state: RowState
}

const RowStatus = ({ state }: RowStatusProps) => {
  if (state === "answered") return <Check className="size-[14px] shrink-0 text-success" />
  if (state === "asking") {
    return (
      <LoaderCircle className="size-[14px] shrink-0 animate-spin text-muted-foreground/50 motion-reduce:animate-none" />
    )
  }

  return <Circle className="size-[14px] shrink-0 text-muted-foreground/30" />
}

interface WitnessLineProps {
  witness: Witness
  value: string
  state: RowState
}

const WitnessLine = ({ witness, value, state }: WitnessLineProps) => {
  const answered = state === "answered"

  return (
    <div className="flex items-center gap-[10px] border-border border-b px-4 py-[11px] last:border-b-0">
      <ResolverMark
        id={witness.resolver}
        className={cn("size-[14px] shrink-0 transition-opacity duration-500", MARK_OPACITY[state])}
      />

      <span className="flex min-w-0 flex-1 items-center gap-2 md:w-[184px] md:flex-none">
        <span
          className={cn(
            "font-mono text-[12.5px] transition-colors duration-500",
            answered ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          {witness.resolver}
        </span>
        <span
          className={cn(
            "truncate font-mono text-[11px] text-muted-foreground transition-opacity duration-500",
            answered ? "opacity-100" : "opacity-50",
          )}
        >
          {witness.address}
        </span>
      </span>

      <span
        className={cn(
          "hidden min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground transition-opacity duration-500 md:block",
          answered ? "opacity-100" : "opacity-50",
        )}
      >
        {state === "waiting" ? "—" : value}
      </span>

      <span
        className={cn(
          "hidden w-[52px] shrink-0 text-right font-mono text-[11.5px] text-muted-foreground transition-opacity duration-500 sm:block",
          answered ? "opacity-100" : "opacity-50",
        )}
      >
        {answered ? witness.latency : "—"}
      </span>

      <RowStatus state={state} />
    </div>
  )
}

export interface WitnessReadoutProps {
  domain: string
  witnesses: readonly Witness[]
  /** The TXT value every resolver is expected to hand back. */
  value: string
  /** What the zone's own nameservers said, which the readout carries once the resolvers agree. */
  authority: string
}

export const WitnessReadout = ({ domain, witnesses, value, authority }: WitnessReadoutProps) => {
  const readout = useWitnessReadout(witnesses.length)
  const agreed = readout.answered === witnesses.length

  return (
    <div
      ref={readout.ref}
      className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_32px_-18px_rgb(0_0_0/0.18)]"
    >
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
        <span className="flex items-center gap-[9px]">
          <span
            className={cn(
              "size-[6px] shrink-0 rounded-full bg-success",
              !agreed &&
                "animate-[ownsi-breathe_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
            )}
          />
          <span className="truncate font-mono text-[12px] text-foreground">
            {agreed ? "read" : "reading"} {domain} &nbsp;·&nbsp; TXT
          </span>
        </span>

        <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">
          {agreed ? "done" : "live"}
        </span>
      </div>

      {witnesses.map((witness, index) => (
        <WitnessLine
          key={`${witness.resolver}-${witness.address}`}
          witness={witness}
          value={value}
          state={rowState(index, readout.answered)}
        />
      ))}

      <div className="flex items-center justify-between gap-3 border-border border-t bg-muted/40 px-4 py-[13px]">
        <span className="font-medium text-[12.5px] text-foreground">
          {readout.answered} of {witnesses.length} {agreed ? "agreed" : "answered"}
        </span>

        <span className="truncate font-mono text-[11.5px] text-muted-foreground">
          {agreed ? authority : "still reading"}
        </span>
      </div>
    </div>
  )
}
