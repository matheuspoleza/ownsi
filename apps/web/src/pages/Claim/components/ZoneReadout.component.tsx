import { Card } from "@ownsi/ui"
import { CircleCheck, CircleEllipsis } from "lucide-react"
import type { ReactNode } from "react"
import type { ZoneDelegation, ZonePublishing } from "../../../api/zone.api.ts"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import { providerName } from "../../../lib/providers.utils.ts"

interface PendingProps {
  children: ReactNode
}

const Pending = ({ children }: PendingProps) => (
  <span className="text-[13px] text-muted-foreground">{children}</span>
)

interface RowProps {
  label: string
  done: boolean
  children: ReactNode
}

const Row = ({ label, done, children }: RowProps) => (
  <div className="flex items-center gap-2.5">
    {done ? (
      <CircleCheck className="size-[15px] shrink-0 text-success" strokeWidth={1.75} />
    ) : (
      <CircleEllipsis
        className="size-[15px] shrink-0 animate-pulse text-muted-foreground"
        strokeWidth={1.75}
      />
    )}
    <dt className="w-[118px] shrink-0 text-[13px] text-muted-foreground">{label}</dt>
    <dd className="min-w-0 flex-1">{children}</dd>
  </div>
)

export interface ZoneReadoutProps {
  delegation?: ZoneDelegation
  publishing?: ZonePublishing
  isSlow: boolean
}

export const ZoneReadout = ({ delegation, publishing, isSlow }: ZoneReadoutProps) => (
  <Card className="w-full max-w-[470px] px-[18px] py-4 text-left">
    <dl className="flex flex-col gap-3">
      <Row label="Nameservers" done={Boolean(delegation)}>
        {delegation ? (
          <span className="font-mono text-[12.5px] text-foreground">
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
            <span className="text-[13px] text-foreground">{providerName(delegation.provider)}</span>
          </span>
        ) : (
          <Pending>matching the nameservers</Pending>
        )}
      </Row>

      <Row label="Publishing speed" done={Boolean(publishing)}>
        {publishing ? (
          <span className="text-[13px] text-foreground">
            {publishing.publishingMinutes != null
              ? `about ${publishing.publishingMinutes} minutes`
              : "could not read the SOA"}
          </span>
        ) : (
          <Pending>reading the SOA</Pending>
        )}
      </Row>
    </dl>

    {isSlow ? (
      <p className="mt-4 border-border border-t pt-3 text-[12.5px] text-muted-foreground">
        This zone's nameservers are slow to answer. We are still reading — it can take a minute.
      </p>
    ) : null}
  </Card>
)
