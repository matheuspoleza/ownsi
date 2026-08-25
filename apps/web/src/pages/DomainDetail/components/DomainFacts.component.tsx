import { cn } from "@ownsi/ui"
import type { ReactNode } from "react"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import type { ProviderId } from "../../../lib/providers.constants.ts"
import { providerName } from "../../../lib/providers.utils.ts"
import type { StatusPill, Tone } from "../DomainDetail.constants.ts"

const PILL_TONES: Record<Tone, string> = {
  idle: "border-border text-muted-foreground",
  running: "border-border text-muted-foreground",
  success: "border-success/50 text-success",
  warning: "border-warning/50 text-warning",
  error: "border-error/50 text-error",
}

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
  status: StatusPill
  provider: ProviderId
  added: string
  lastChecked: string
}

export const DomainFacts = ({ status, provider, added, lastChecked }: DomainFactsProps) => (
  <dl className="flex pt-[22px]">
    <Fact label="Status">
      <span
        className={cn(
          "rounded-full border px-2 py-[3px] font-medium text-[12px]",
          PILL_TONES[status.tone],
        )}
      >
        {status.label}
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
