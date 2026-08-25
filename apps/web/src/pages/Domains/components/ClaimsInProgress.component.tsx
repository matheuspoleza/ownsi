import { cn } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import { formatDuration, secondsSince } from "../../../lib/time.utils.ts"
import { RUNNING_STATUS_PILLS } from "../../DomainDetail/DomainDetail.constants.ts"
import { NEXT_STEPS } from "../Domains.constants.ts"
import type { OpenClaim } from "../hooks/useDashboardState.ts"

const DOT_TONES = {
  idle: "bg-muted-foreground/40",
  running: "bg-muted-foreground/40",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
}

interface RowProps {
  entry: OpenClaim
  now: number
}

const Row = ({ entry: { claim, domain, verification }, now }: RowProps) => {
  const status = RUNNING_STATUS_PILLS[verification?.status ?? "checking"]

  return (
    <Link
      to="/domains/$domain"
      params={{ domain: domain.name }}
      className="flex items-center gap-3.5 border-border border-b px-4 py-[11px] transition-colors last:border-b-0 hover:bg-accent"
    >
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border border-border bg-card">
        <ProviderGlyph provider="other" className="size-3" />
      </span>

      <span className="min-w-0 flex-1 truncate font-medium text-[13.5px] text-foreground">
        {domain.unicodeName}
      </span>

      <span className="hidden w-[190px] shrink-0 items-center gap-2 sm:flex">
        <span className={cn("size-2 shrink-0 rounded-full", DOT_TONES[status.tone])} />
        <span className="text-[13px] text-foreground">{status.label}</span>
      </span>

      <span className="hidden w-[110px] shrink-0 text-[13px] text-muted-foreground md:block">
        {formatDuration(secondsSince(claim.createdAt, now))}
      </span>

      <span className="hidden min-w-0 flex-1 truncate text-[13px] text-muted-foreground lg:block">
        {NEXT_STEPS[verification?.status ?? "checking"]}
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

export interface ClaimsInProgressProps {
  entries: readonly OpenClaim[]
  now: number
}

export const ClaimsInProgress = ({ entries, now }: ClaimsInProgressProps) => {
  const needing = entries.filter(({ verification }) => verification?.status === "needs_attention")

  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 pt-7 pb-3">
        <h2 className="font-semibold text-[13px] text-foreground">Claims in progress</h2>
        <span className="text-[13px] text-muted-foreground">{entries.length}</span>
        {needing.length > 0 ? (
          <>
            <span className="size-[5px] rounded-full bg-error" />
            <span className="text-[13px] text-error">{needing.length} need you</span>
          </>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3.5 border-border border-b px-4 py-[9px]">
          <span className="w-[22px] shrink-0" />
          <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">Domain</span>
          <span className="hidden w-[190px] shrink-0 text-[13px] text-muted-foreground sm:block">
            Status
          </span>
          <span className="hidden w-[110px] shrink-0 text-[13px] text-muted-foreground md:block">
            Waiting
          </span>
          <span className="hidden min-w-0 flex-1 text-[13px] text-muted-foreground lg:block">
            Next step
          </span>
          <span className="size-4 shrink-0" />
        </div>

        {entries.map((entry) => (
          <Row key={entry.claim.id} entry={entry} now={now} />
        ))}
      </div>
    </section>
  )
}
