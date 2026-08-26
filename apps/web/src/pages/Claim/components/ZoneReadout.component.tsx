import { cn } from "@ownsi/ui"
import { Check, LoaderCircle } from "lucide-react"
import type { ReactNode } from "react"
import type { ZoneDelegation, ZonePublishing } from "../../../api/zone.api.ts"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import { providerName } from "../../../lib/providers.utils.ts"

interface RowProps {
  label: string
  done: boolean
  children: ReactNode
}

const Row = ({ label, done, children }: RowProps) => (
  <div className="flex items-center gap-[10px] border-border border-b px-4 py-[11px] last:border-b-0">
    <span className="w-[128px] shrink-0 text-[12.5px] text-muted-foreground">{label}</span>
    <span className="min-w-0 flex-1">{children}</span>
    {done ? (
      <Check className="size-[14px] shrink-0 text-success" />
    ) : (
      <LoaderCircle className="size-[14px] shrink-0 animate-spin text-muted-foreground/50 motion-reduce:animate-none" />
    )}
  </div>
)

const footerNote = (read: boolean, isSlow: boolean) => {
  if (isSlow) return "these nameservers are slow to answer"
  return read ? "nothing written yet" : "still reading"
}

interface PendingProps {
  children: ReactNode
}

const Pending = ({ children }: PendingProps) => (
  <span className="text-[12.5px] text-muted-foreground/70">{children}</span>
)

export interface ZoneReadoutProps {
  domain: string
  delegation?: ZoneDelegation
  publishing?: ZonePublishing
  isSlow: boolean
}

export const ZoneReadout = ({ domain, delegation, publishing, isSlow }: ZoneReadoutProps) => {
  const read = Boolean(delegation && publishing)

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_32px_-18px_rgb(0_0_0/0.18)]">
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
        <span className="flex min-w-0 items-center gap-[9px]">
          <span
            className={cn(
              "size-[6px] shrink-0 rounded-full bg-success",
              !read &&
                "animate-[ownsi-breathe_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
            )}
          />
          <span className="truncate font-mono text-[12px] text-foreground">
            {read ? "read" : "reading"} {domain} &nbsp;·&nbsp; NS
          </span>
        </span>

        <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">
          {read ? "done" : "live"}
        </span>
      </div>

      <Row label="Nameservers" done={Boolean(delegation)}>
        {delegation ? (
          <span className="truncate font-mono text-[12.5px] text-foreground">
            {delegation.nameservers[0]}
          </span>
        ) : (
          <Pending>asking the registry</Pending>
        )}
      </Row>

      <Row label="Provider" done={Boolean(delegation)}>
        {delegation ? (
          <span className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
              <ProviderGlyph provider={delegation.provider} className="size-[11px]" />
            </span>
            <span className="text-[12.5px] text-foreground">
              {providerName(delegation.provider)}
            </span>
          </span>
        ) : (
          <Pending>matching the nameservers</Pending>
        )}
      </Row>

      <Row label="Publishing speed" done={Boolean(publishing)}>
        {publishing ? (
          <span className="text-[12.5px] text-foreground">
            {publishing.publishingMinutes != null
              ? `about ${publishing.publishingMinutes} minutes`
              : "could not read the SOA"}
          </span>
        ) : (
          <Pending>reading the SOA</Pending>
        )}
      </Row>

      <div className="flex items-center justify-between gap-3 border-border border-t bg-muted/40 px-4 py-[13px]">
        <span className="font-medium text-[12.5px] text-foreground">
          {read ? "Zone read" : "Reading the zone"}
        </span>

        <span className="truncate font-mono text-[11.5px] text-muted-foreground">
          {footerNote(read, isSlow)}
        </span>
      </div>
    </div>
  )
}
