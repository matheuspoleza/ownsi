import { ArrowUpRight, Users } from "lucide-react"
import { Avatar } from "../../../components/Avatar.component.tsx"
import { HelpTip } from "../../../components/HelpTip.component.tsx"
import { formatDate } from "../../../lib/time.utils.ts"
import { COEXISTENCE_TIP, DISPUTES_URL } from "../DomainDetail.constants.ts"
import type { Holder } from "../DomainDetail.utils.ts"

interface HolderRowProps {
  holder: Holder
}

const HolderRow = ({ holder: { email, provedAt, ordinal, isYou } }: HolderRowProps) => (
  <div className="flex items-center gap-3 border-border border-b px-4 py-3">
    <Avatar seed={email} className="size-[28px]" />

    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <span className="flex items-center gap-2">
        <span className="truncate font-mono text-[12.5px] text-foreground">{email}</span>
        {isYou ? (
          <span className="shrink-0 rounded-[4px] bg-muted px-1.5 py-[2px] text-[10.5px] text-muted-foreground">
            you
          </span>
        ) : null}
      </span>
      <span className="text-[11.5px] text-muted-foreground">proved {formatDate(provedAt)}</span>
    </span>

    <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">{ordinal}</span>
  </div>
)

export interface CoexistenceCardProps {
  holders: readonly Holder[]
}

export const CoexistenceCard = ({ holders }: CoexistenceCardProps) => (
  <section className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-[11px]">
      <span className="flex items-center gap-2">
        <Users className="size-[15px] text-muted-foreground" strokeWidth={1.6} />
        <h2 className="font-semibold text-[14px] text-foreground">Also claimed by</h2>
        <HelpTip label="What two proofs on one name mean">{COEXISTENCE_TIP}</HelpTip>
      </span>
      <span className="text-[12.5px] text-muted-foreground">{holders.length} accounts</span>
    </div>

    {holders.map((holder) => (
      <HolderRow key={holder.email} holder={holder} />
    ))}

    <div className="flex justify-end px-4 py-[11px]">
      <a
        href={DISPUTES_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 font-mono text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        how disputes work
        <ArrowUpRight className="size-3.5" />
      </a>
    </div>
  </section>
)
