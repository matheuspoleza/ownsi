import { HelpTip } from "../../../components/HelpTip.component.tsx"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import type { ProviderId } from "../../../lib/providers.constants.ts"
import { providerName } from "../../../lib/providers.utils.ts"
import { formatDate } from "../../../lib/time.utils.ts"
import { DNS_SNAPSHOT_TIP } from "../DomainDetail.constants.ts"

export interface DnsCardProps {
  provider: ProviderId
  nameservers: readonly string[]
  observedAt: string
}

export const DnsCard = ({ provider, nameservers, observedAt }: DnsCardProps) => (
  <section className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-[11px]">
      <h2 className="font-semibold text-[14px] text-foreground">DNS</h2>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[12.5px] text-muted-foreground">
          {formatDate(observedAt)}
        </span>
        <HelpTip label="How this reading was taken">{DNS_SNAPSHOT_TIP}</HelpTip>
      </span>
    </div>

    <div className="flex items-center gap-3 border-border border-b px-4 py-[13px]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        <ProviderGlyph provider={provider} className="size-[22px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-[2px]">
        <span className="truncate font-semibold text-[15px] text-foreground">
          {providerName(provider)}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          DNS provider &nbsp;·&nbsp; {nameservers.length} nameservers
        </span>
      </span>
    </div>

    <div className="flex items-start gap-3.5 px-4 py-[11px]">
      <span className="w-[110px] shrink-0 text-[12.5px] text-muted-foreground">Nameservers</span>
      <span className="flex min-w-0 flex-col gap-[5px]">
        {nameservers.map((nameserver) => (
          <span key={nameserver} className="truncate font-mono text-[12.5px] text-foreground">
            {nameserver}
          </span>
        ))}
      </span>
    </div>
  </section>
)
