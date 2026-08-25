import { DotWorldMap, OwnsiMark } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { formatDate } from "../../../lib/time.utils.ts"
import type { ProvedClaim } from "../hooks/useDashboardState.ts"

const TEAR = "repeating-linear-gradient(to right, #FFFFFF33 0 7px, transparent 7px 12px)"

interface FactProps {
  label: string
  children: ReactNode
}

const Fact = ({ label, children }: FactProps) => (
  <div className="flex items-baseline justify-between gap-3 border-white/15 border-b py-[7px]">
    <dt className="text-[12.5px] text-white/55">{label}</dt>
    <dd className="font-medium text-[13px]">{children}</dd>
  </div>
)

export interface ProofTicketCardProps {
  entry: ProvedClaim
  ink: string
}

export const ProofTicketCard = ({ entry: { claim, domain }, ink }: ProofTicketCardProps) => (
  <Link
    to="/domains/$domain"
    params={{ domain: domain.name }}
    className="relative flex flex-col overflow-hidden rounded-xl px-5 pt-[18px] pb-5 text-white transition-transform hover:-translate-y-[2px]"
    style={{ backgroundColor: ink }}
  >
    <DotWorldMap className="pointer-events-none absolute top-4 right-[-140px] h-[190px] w-[520px] text-white/[0.10]" />

    <div className="relative flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-[6px]">
          <OwnsiMark className="h-[17px] w-[12px] text-white" />
          <span className="font-semibold text-[12.5px]">ownsi</span>
        </span>
        <span className="text-[10.5px] text-white/60 tracking-[0.4px]">Proof of ownership</span>
      </div>

      <p className="truncate pt-5 font-semibold text-[22px] leading-tight tracking-[-0.5px]">
        {domain.unicodeName}
      </p>

      <dl className="flex flex-col pt-3.5">
        <Fact label="Proved">{claim.endedAt === null ? "—" : formatDate(claim.endedAt)}</Fact>
      </dl>

      <p className="truncate pt-3.5 font-mono text-[11.5px] text-white/60">{claim.token}</p>
    </div>

    <span
      aria-hidden
      className="relative mt-4 h-px w-full shrink-0"
      style={{ backgroundImage: TEAR }}
    />
  </Link>
)
