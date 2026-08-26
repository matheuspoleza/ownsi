import { AnimateIcon, ArrowRightIcon, Button, cn } from "@ownsi/ui"
import type { Claim } from "../../../api/claim.api.ts"
import { ProofTicket } from "../../../components/ProofTicket.component.tsx"
import { useProofLink } from "../../../hooks/useProofLink.ts"
import { proofPublication } from "../../../lib/proof.utils.ts"
import {
  ARCHIVED_CAPTION,
  AWAITED_CAPTION,
  HELD_CAPTION,
  PANEL_ACTIONS,
  PREVIEW_RECORD,
  TICKET_INKS,
} from "../Domains.constants.ts"
import type { DomainRow } from "../hooks/useDashboardState.ts"
import { ProofShare } from "./ProofShare.component.tsx"

export interface ProofPanelProps {
  row: DomainRow
  /** The proof this domain holds, or null while it is still owed one. */
  claim: Claim | null
  /** Which of the four inks this proof wears, so a domain keeps its colour as you read down. */
  ink: number
  /** The panel stands in the rail beside the table, so it reads down one column instead of across. */
  inRail?: boolean
  onOpen: (domain: string) => void
}

export const ProofPanel = ({ row, claim, ink, inRail = false, onOpen }: ProofPanelProps) => {
  const share = useProofLink({ claimId: claim?.id ?? null })

  const publication = share.link === null ? null : proofPublication(share.link.url)
  const archived = row.listed.archived

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium font-mono text-[13.5px] text-foreground">
          {row.listed.unicodeName}
        </h2>
        <p className="text-[12.5px] text-muted-foreground">
          {archived ? ARCHIVED_CAPTION : claim === null ? AWAITED_CAPTION : HELD_CAPTION}
        </p>
      </div>

      <div
        className={cn(
          "flex flex-col gap-8 lg:flex-row lg:gap-12",
          inRail && "xl:flex-col xl:gap-6",
        )}
      >
        <ProofTicket
          domain={row.listed.unicodeName}
          provedAt={claim?.endedAt ?? null}
          token={claim?.token ?? PREVIEW_RECORD.value}
          publication={publication}
          ink={claim === null ? undefined : TICKET_INKS[ink % TICKET_INKS.length]}
          className={cn(
            "w-full shrink-0 lg:w-[298px]",
            inRail && "xl:w-full",
            (claim === null || archived) && "opacity-45",
          )}
        />

        <ProofShare
          publication={publication}
          onPublish={share.publish}
          onRevoke={share.revoke}
          isPublishing={share.isPublishing}
          preview={claim === null}
          archived={archived}
          action={
            <AnimateIcon asChild animateOnHover>
              <Button
                variant={claim === null && !archived ? "default" : "outline"}
                size="sm"
                icon={<ArrowRightIcon />}
                onClick={() => onOpen(row.listed.name)}
              >
                <span className="font-mono lowercase">{PANEL_ACTIONS[row.status]}</span>
              </Button>
            </AnimateIcon>
          }
        />
      </div>
    </section>
  )
}
