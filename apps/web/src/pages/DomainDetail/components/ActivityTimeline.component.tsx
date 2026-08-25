import { cn } from "@ownsi/ui"
import { formatDuration, secondsSince } from "../../../lib/time.utils.ts"
import { type ActivityEntry, type EntryTone, groupActivity } from "./ActivityTimeline.utils.ts"

const DOT_TONES: Record<EntryTone, string> = {
  idle: "bg-muted-foreground/50",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
}

export interface ActivityTimelineProps {
  entries: readonly ActivityEntry[]
  now: number
}

export const ActivityTimeline = ({ entries, now }: ActivityTimelineProps) => {
  const groups = groupActivity(entries)

  return (
    <section className="flex flex-col gap-3.5 border-border border-t pt-[26px]">
      <h2 className="font-semibold text-[13px] text-foreground">Activity</h2>

      <ol className="flex flex-col">
        {groups.map((group, index) => (
          <li key={group.id} className="flex items-stretch gap-3">
            <span className="flex w-[7px] shrink-0 flex-col items-center gap-1 pt-[5px]">
              <span className={cn("size-[7px] shrink-0 rounded-full", DOT_TONES[group.tone])} />
              {index === groups.length - 1 ? null : <span className="w-px flex-1 bg-border" />}
            </span>

            <span className="flex flex-col gap-[3px] pb-5">
              <span className="flex items-center gap-2">
                <span className="font-medium text-[14px] text-foreground">{group.title}</span>
                {group.count > 1 ? (
                  <span className="rounded-full bg-muted px-[7px] py-px font-medium text-[11px] text-muted-foreground tabular-nums">
                    {group.count}
                  </span>
                ) : null}
              </span>

              <span className="text-[13px] text-muted-foreground">
                {formatDuration(secondsSince(group.at, now))} ago
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
