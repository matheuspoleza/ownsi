import { cn } from "@ownsi/ui"
import { type DomainTab, STATUS_LABELS } from "../../../lib/status.constants.ts"

export interface StatusTab {
  tab: DomainTab | null
  count: number
}

export interface StatusFilterProps {
  tabs: readonly StatusTab[]
  selected: DomainTab | null
  onSelect: (tab: DomainTab | null) => void
}

export const StatusFilter = ({ tabs, selected, onSelect }: StatusFilterProps) => (
  <div className="flex flex-wrap items-center gap-1">
    {tabs.map(({ tab, count }) => (
      <button
        key={tab ?? "all"}
        type="button"
        onClick={() => onSelect(tab)}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-sm px-[11px] py-[6px] text-[12.5px] transition-colors",
          tab === selected
            ? "bg-accent font-semibold text-foreground"
            : "text-muted-foreground hover:text-foreground",
          tab === "archived" && tab !== selected && "text-muted-foreground/70",
        )}
      >
        {tab === null ? "all" : STATUS_LABELS[tab]}
        <span className="font-mono text-[11.5px] text-muted-foreground">{count}</span>
      </button>
    ))}
  </div>
)
