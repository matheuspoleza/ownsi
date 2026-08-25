import { TICKET_INKS } from "../Domains.constants.ts"
import type { ProvedClaim } from "../hooks/useDashboardState.ts"
import { ProofTicketCard } from "./ProofTicketCard.component.tsx"

export interface ProofWalletProps {
  entries: readonly ProvedClaim[]
}

export const ProofWallet = ({ entries }: ProofWalletProps) => (
  <section className="flex flex-col">
    <div className="flex items-center gap-2 pt-10 pb-3">
      <h2 className="font-semibold text-[13px] text-foreground">Proof of ownership</h2>
      <span className="text-[13px] text-muted-foreground">{entries.length}</span>
    </div>

    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
      {entries.map((entry, index) => (
        <ProofTicketCard
          key={entry.claim.id}
          entry={entry}
          ink={TICKET_INKS[index % TICKET_INKS.length] ?? TICKET_INKS[0]}
        />
      ))}
    </div>
  </section>
)
