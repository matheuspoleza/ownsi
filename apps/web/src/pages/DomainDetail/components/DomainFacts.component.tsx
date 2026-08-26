import { cn } from "@ownsi/ui"
import type { ReactNode } from "react"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import type { ProviderId } from "../../../lib/providers.constants.ts"
import { providerName } from "../../../lib/providers.utils.ts"
import {
  type DomainStatus,
  STATUS_DOTS,
  STATUS_LABELS,
  STATUS_PILLS,
} from "../../../lib/status.constants.ts"

interface FactProps {
  label: string
  children: ReactNode
}

const Fact = ({ label, children }: FactProps) => (
  <div className="flex w-[180px] flex-col gap-1.5">
    <dt className="text-[12px] text-muted-foreground">{label}</dt>
    <dd className="flex items-center gap-1.5 text-[13px] text-foreground">{children}</dd>
  </div>
)

export interface DomainFactsProps {
  status: DomainStatus
  provider: ProviderId
  added: string
  lastChecked: string
}

export const DomainFacts = ({ status, provider, added, lastChecked }: DomainFactsProps) => (
  <dl className="flex pt-[22px]">
    <Fact label="Status">
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-[4px] font-mono text-[12px]",
          STATUS_PILLS[status],
        )}
      >
        <span className={cn("size-[6px] rounded-full", STATUS_DOTS[status])} />
        {STATUS_LABELS[status]}
      </span>
    </Fact>

    <Fact label="Provider">
      <ProviderGlyph provider={provider} className="size-4" />
      {providerName(provider)}
    </Fact>

    <Fact label="Added">{added}</Fact>
    <Fact label="Last checked">{lastChecked}</Fact>
  </dl>
)
