import { cn } from "@ownsi/ui"
import { type DomainFilter, STATUS_LABELS } from "../../../lib/status.constants.ts"

export interface StatusTab {
  status: DomainFilter | null
  count: number
}

export interface StatusFilterProps {
  tabs: readonly StatusTab[]
  selected: DomainFilter | null
  onSelect: (status: DomainFilter | null) => void
}

export const StatusFilter = ({ tabs, selected, onSelect }: StatusFilterProps) => (
  <div className="flex flex-wrap items-center gap-1">
    {tabs.map(({ status, count }) => (
      <button
        key={status ?? "all"}
        type="button"
        onClick={() => onSelect(status)}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-sm px-[11px] py-[6px] text-[12.5px] transition-colors",
          status === selected
            ? "bg-accent font-semibold text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {status === null ? "all" : STATUS_LABELS[status]}
        <span className="font-mono text-[11.5px] text-muted-foreground">{count}</span>
      </button>
    ))}
  </div>
)
