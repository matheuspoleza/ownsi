import { cn } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { formatDate } from "../../../lib/time.utils.ts"
import { CLAIM_STATE_LABELS } from "../Domains.constants.ts"
import type { DomainSummary } from "../hooks/useDashboardState.ts"

const TONES = {
  pending: "text-muted-foreground",
  proved: "text-success",
  expired: "text-warning",
  canceled: "text-muted-foreground",
}

interface RowProps {
  summary: DomainSummary
}

const Row = ({ summary: { domain, latest } }: RowProps) => (
  <Link
    to="/domains/$domain"
    params={{ domain: domain.name }}
    className="flex items-center gap-3.5 border-border border-b px-4 py-[11px] transition-colors last:border-b-0 hover:bg-accent"
  >
    <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">
      {domain.unicodeName}
    </span>

    {latest ? (
      <>
        <span className={cn("shrink-0 text-[13px]", TONES[latest.state])}>
          {CLAIM_STATE_LABELS[latest.state]}
        </span>
        <span className="hidden w-[110px] shrink-0 text-right text-[13px] text-muted-foreground sm:block">
          {formatDate(latest.endedAt ?? latest.createdAt)}
        </span>
      </>
    ) : (
      <span className="shrink-0 text-[13px] text-muted-foreground">never claimed</span>
    )}

    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
  </Link>
)

export interface AllDomainsProps {
  summaries: readonly DomainSummary[]
}

export const AllDomains = ({ summaries }: AllDomainsProps) => (
  <section className="flex flex-col">
    <div className="flex items-center gap-2 pt-10 pb-3">
      <h2 className="font-semibold text-[13px] text-foreground">All domains</h2>
      <span className="text-[13px] text-muted-foreground">{summaries.length}</span>
    </div>

    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {summaries.map((summary) => (
        <Row key={summary.domain.id} summary={summary} />
      ))}
    </div>
  </section>
)
