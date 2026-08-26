import { cn, Skeleton } from "@ownsi/ui"
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
import { useRowKeys } from "../hooks/useRowKeys.ts"

const COLUMNS = "grid-cols-[minmax(0,1.6fr)_96px_minmax(0,1fr)_76px_16px] gap-4"

const LIST_LABEL = "Domains on this account"

interface RowProps {
  row: DomainRow
  now: number
  reading: boolean
  onRead: () => void
  onOpen: () => void
}

const Row = ({ row: { listed, verification, status }, now, reading, onRead, onOpen }: RowProps) => {
  const step = nextStep(listed, verification)
  const updated = updatedLabel(listed, status, now)

  return (
    <button
      type="button"
      data-row
      role="option"
      aria-selected={reading}
      tabIndex={reading ? 0 : -1}
      onClick={reading ? onOpen : onRead}
      className={cn(
        "grid w-full cursor-pointer items-center border-border border-b px-4 py-[13px] text-left outline-none transition-colors last:border-b-0 hover:bg-accent focus-visible:ring-[2px] focus-visible:ring-ring/40 focus-visible:ring-inset",
        reading && "bg-accent",
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

      <ChevronRight
        className={cn("size-4", reading ? "text-foreground" : "text-muted-foreground")}
      />
    </button>
  )
}

const ReadingRow = () => (
  <div className={cn("grid items-center border-border border-t px-4 py-[13px]", COLUMNS)}>
    <span className="flex items-center gap-3">
      <Skeleton className="size-[26px] shrink-0 rounded-md" />
      <Skeleton className="h-3 w-[150px]" />
    </span>
    <Skeleton className="h-3 w-[74px]" />
    <Skeleton className="hidden h-3 w-[120px] md:block" />
    <Skeleton className="hidden h-3 w-[58px] justify-self-end sm:block" />
    <span />
  </div>
)

export interface DomainTableProps {
  rows: readonly DomainRow[]
  now: number
  /** The row the proof panel is reading, so it stays marked while you look at it. */
  readingId: string | null
  /** The next batch is on its way, so the table ends on the row it is about to fill. */
  readingMore: boolean
  onRead: (domainId: string) => void
  /** Clicking the row already being read opens it, so a second click is the way in. */
  onOpen: (domain: string) => void
}

export const DomainTable = ({
  rows,
  now,
  readingId,
  readingMore,
  onRead,
  onOpen,
}: DomainTableProps) => {
  const keys = useRowKeys({ rows, readingId, onRead })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={cn("grid items-center px-4 py-[11px]", COLUMNS)}>
        <span className="text-[12px] text-muted-foreground">Domain</span>
        <span className="text-[12px] text-muted-foreground">Status</span>
        <span className="hidden text-[12px] text-muted-foreground md:block">Next step</span>
        <span className="hidden text-right text-[12px] text-muted-foreground sm:block">
          Updated
        </span>
        <span />
      </div>

      <div
        ref={keys.list}
        role="listbox"
        aria-label={LIST_LABEL}
        onKeyDown={keys.onKeyDown}
        className="border-border border-t"
      >
        {rows.map((row) => (
          <Row
            key={row.listed.id}
            row={row}
            now={now}
            reading={row.listed.id === readingId}
            onRead={() => onRead(row.listed.id)}
            onOpen={() => onOpen(row.listed.name)}
          />
        ))}
      </div>

      {readingMore ? <ReadingRow /> : null}
    </div>
  )
}
