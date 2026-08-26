import { Button } from "@ownsi/ui"
import { Link } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { Claim } from "../../../api/claim.api.ts"
import { ProofTicket } from "../../../components/ProofTicket.component.tsx"
import { useProofLink } from "../../../hooks/useProofLink.ts"
import { proofPublication } from "../../../lib/proof.utils.ts"
import { TICKET_INKS } from "../Domains.constants.ts"
import { ProofShare } from "./ProofShare.component.tsx"

/** The two cards behind the top one, so a wallet of several reads as a deck and not as one. */
const DECK_INKS = ["#0C4B2C", "#0A3D24"] as const

export interface ProofsYouHoldProps {
  proofs: readonly Claim[]
}

export const ProofsYouHold = ({ proofs }: ProofsYouHoldProps) => {
  const [index, setIndex] = useState(0)

  const at = Math.min(index, proofs.length - 1)
  const claim = proofs[at]
  const share = useProofLink({ claimId: claim?.id ?? null })

  if (!claim) return null

  const publication = share.link === null ? null : proofPublication(share.link.url)
  const behind = Math.min(proofs.length - 1, DECK_INKS.length)

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between gap-4 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-[13.5px] text-foreground">Proofs you hold</h2>
          <span className="font-mono text-[12px] text-muted-foreground">{proofs.length}</span>
        </div>

        {proofs.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-muted-foreground">
              {at + 1} of {proofs.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous proof"
              disabled={at === 0}
              onClick={() => setIndex(at - 1)}
              className="size-[28px] [&_svg]:size-[15px]"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next proof"
              disabled={at === proofs.length - 1}
              onClick={() => setIndex(at + 1)}
              className="size-[28px] [&_svg]:size-[15px]"
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="relative h-[280px] w-[324px] shrink-0">
          {DECK_INKS.slice(0, behind).map((ink, depth) => (
            <span
              key={ink}
              aria-hidden
              className="absolute h-[252px] w-[298px] rounded-xl"
              style={{
                backgroundColor: ink,
                left: (depth + 1) * 12,
                top: (depth + 1) * 8,
              }}
            />
          ))}

          <Link
            to="/domains/$domain"
            params={{ domain: claim.domain }}
            className="absolute top-0 left-0 block w-[298px] transition-transform hover:-translate-y-[2px]"
          >
            <ProofTicket
              domain={claim.unicodeDomain}
              provedAt={claim.endedAt}
              token={claim.token}
              publication={publication}
              ink={TICKET_INKS[at % TICKET_INKS.length]}
            />
          </Link>
        </div>

        <ProofShare
          publication={publication}
          onPublish={share.publish}
          onRevoke={share.revoke}
          isPublishing={share.isPublishing}
        />
      </div>
    </section>
  )
}
