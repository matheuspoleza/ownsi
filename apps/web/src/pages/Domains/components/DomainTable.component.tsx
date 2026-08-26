import { AnimateIcon, cn } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import {
  STATUS_DOTS,
  STATUS_INKS,
  STATUS_LABELS,
  STATUS_PLATES,
} from "../../../lib/status.constants.ts"
import { nextStep, updatedLabel } from "../Domains.utils.ts"
import type { DomainRow } from "../hooks/useDashboardState.ts"

const COLUMNS = "grid-cols-[1fr_150px_1fr_120px_16px] gap-4"

interface RowProps {
  row: DomainRow
  now: number
}

const Row = ({ row: { listed, verification, status }, now }: RowProps) => {
  const step = nextStep(listed, verification)
  const updated = updatedLabel(listed, status, now)

  return (
    <AnimateIcon asChild animateOnHover>
      <Link
        to="/domains/$domain"
        params={{ domain: listed.name }}
        className={cn(
          "grid items-center border-border border-b px-4 py-[13px] transition-colors last:border-b-0 hover:bg-accent",
          COLUMNS,
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-[26px] shrink-0 items-center justify-center rounded-md border",
              STATUS_PLATES[status],
            )}
          >
            <ProviderGlyph provider="other" className="size-[14px]" />
          </span>
          <span
            className={cn(
              "truncate font-medium font-mono text-[13.5px]",
              status === "canceled" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {listed.unicodeName}
          </span>
        </span>

        <span className="flex items-center gap-2">
          <span className={cn("size-[7px] shrink-0 rounded-full", STATUS_DOTS[status])} />
          <span className={cn("text-[13px]", STATUS_INKS[status])}>{STATUS_LABELS[status]}</span>
        </span>

        <span className="hidden min-w-0 truncate text-[13px] text-foreground md:block">
          {step ?? <span className="text-muted-foreground">—</span>}
        </span>

        <span className="hidden text-right text-[12.5px] text-muted-foreground sm:block">
          {updated ?? "—"}
        </span>

        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </AnimateIcon>
  )
}

export interface DomainTableProps {
  rows: readonly DomainRow[]
  now: number
}

export const DomainTable = ({ rows, now }: DomainTableProps) => (
  <div className="overflow-hidden rounded-lg border border-border bg-card">
    <div className={cn("grid items-center px-4 py-[11px]", COLUMNS)}>
      <span className="text-[12px] text-muted-foreground">Domain</span>
      <span className="text-[12px] text-muted-foreground">Status</span>
      <span className="hidden text-[12px] text-muted-foreground md:block">Next step</span>
      <span className="hidden text-right text-[12px] text-muted-foreground sm:block">Updated</span>
      <span />
    </div>

    <div className="border-border border-t">
      {rows.map((row) => (
        <Row key={row.listed.id} row={row} now={now} />
      ))}
    </div>
  </div>
)
