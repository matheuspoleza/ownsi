import { cn, DotWorldMap, OwnsiSeal } from "@ownsi/ui"
import type { ReactNode } from "react"
import type { ProofPublication } from "../lib/proof.utils.ts"
import type { ProviderId } from "../lib/providers.constants.ts"
import { providerName } from "../lib/providers.utils.ts"
import { formatDate } from "../lib/time.utils.ts"
import { ProofQr } from "./ProofQr.component.tsx"
import { ProviderGlyph } from "./ProviderGlyph.component.tsx"

const NOT_SHARED = "not shared yet"

const TEAR = "repeating-linear-gradient(to right, #FFFFFF3D 0 7px, transparent 7px 12px)"

interface FactProps {
  label: string
  children: ReactNode
}

const Fact = ({ label, children }: FactProps) => (
  <div className="flex items-center justify-between gap-3 border-white/15 border-b py-[6px] last:border-b-0">
    <dt className="text-[10.5px] text-white/50">{label}</dt>
    <dd className="flex items-center gap-2 font-medium text-[11.5px]">{children}</dd>
  </div>
)

interface NotchProps {
  className: string
}

const Notch = ({ className }: NotchProps) => (
  <span aria-hidden className={cn("absolute size-[22px] rounded-full bg-background", className)} />
)

export interface ProofTicketProps {
  domain: string
  provedAt: string | null
  /** Named on the ticket only once the zone has been read; the row is dropped until then. */
  provider?: ProviderId
  token: string
  /** Null until a link has been published: a proof is not shared unless somebody asks. */
  publication: ProofPublication | null
  ink?: string
  className?: string
}

export const ProofTicket = ({
  domain,
  provedAt,
  provider,
  token,
  publication,
  ink,
  className,
}: ProofTicketProps) => (
  <article
    className={cn(
      "relative flex flex-col overflow-hidden rounded-xl bg-proof text-proof-foreground",
      className,
    )}
    style={ink ? { backgroundColor: ink } : undefined}
  >
    <DotWorldMap className="pointer-events-none absolute top-3 right-[-120px] h-[170px] w-[470px] text-white/[0.10]" />

    <div className="relative flex flex-col px-4 pt-[17px] pb-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-[6px]">
          <OwnsiSeal className="h-[22px] w-[19px] text-proof-foreground" />
          <span className="font-semibold text-[11.5px]">ownsi</span>
        </span>
        <span className="font-medium text-[9.5px] text-white/70 tracking-[0.4px]">
          Proof of ownership
        </span>
      </div>

      <p className="truncate pt-4 font-semibold text-[21px] leading-tight tracking-[-0.5px]">
        {domain}
      </p>

      <dl className="flex flex-col pt-2.5">
        <Fact label="Proved">{provedAt === null ? "—" : formatDate(provedAt)}</Fact>
        {provider ? (
          <Fact label="Provider">
            <span className="flex size-[17px] shrink-0 items-center justify-center rounded-[5px] bg-white">
              <ProviderGlyph provider={provider} className="size-[10px]" />
            </span>
            {providerName(provider)}
          </Fact>
        ) : null}
      </dl>

      <p className="truncate pt-2.5 font-mono text-[10.5px] text-white/70">{token}</p>
    </div>

    <div className="relative">
      <Notch className="-top-[11px] -left-[11px]" />
      <Notch className="-top-[11px] -right-[11px]" />
      <span aria-hidden className="block h-px w-full" style={{ backgroundImage: TEAR }} />
    </div>

    <div className="relative flex items-center gap-[11px] px-4 pt-[13px] pb-[15px]">
      <span className="flex size-[44px] shrink-0 items-center justify-center rounded-md bg-white">
        <ProofQr className="size-[36px] text-proof" />
      </span>
      <span className="flex min-w-0 flex-col gap-[5px]">
        <span className="truncate font-mono text-[9.5px] text-white/70">
          {publication === null ? NOT_SHARED : publication.link}
        </span>
        <span className="flex items-center gap-1.5 text-[10.5px] text-white/70">
          <span className="size-[5px] rounded-full bg-white/70" />
          Does not expire
        </span>
      </span>
    </div>
  </article>
)
