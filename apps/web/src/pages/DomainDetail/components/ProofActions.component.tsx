import { ChevronRight, Code2, ExternalLink, Link2, LoaderCircle, Unlink } from "lucide-react"
import type { ReactNode } from "react"
import { useCopy } from "../../../hooks/useCopy.ts"
import type { ProofPublication } from "../../../lib/proof.utils.ts"

const ROW =
  "flex w-full cursor-pointer items-center gap-3 border-border border-b px-4 py-[13px] text-left transition-colors last:border-b-0 not-disabled:hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"

interface ActionProps {
  icon: ReactNode
  label: string
  onClick: () => void
  pending?: boolean
  disabled?: boolean
}

const Action = ({ icon, label, onClick, pending = false, disabled = false }: ActionProps) => (
  <button type="button" onClick={onClick} disabled={pending || disabled} className={ROW}>
    <span className="flex shrink-0 text-muted-foreground [&_svg]:size-[15px]">
      {pending ? <LoaderCircle className="animate-spin" /> : icon}
    </span>
    <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{label}</span>
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
  </button>
)

interface CopyActionProps {
  icon: ReactNode
  label: string
  value: string
}

const CopyAction = ({ icon, label, value }: CopyActionProps) => {
  const { copied, copy } = useCopy(value)

  return <Action icon={icon} label={copied ? "Copied" : label} onClick={copy} />
}

const ARCHIVED_NOTE =
  "This domain is off your list, and archiving took back every link published from it — those addresses stopped resolving. The proof stands as a record. Claim the domain again to prove it afresh and publish a new link."

export interface ProofActionsProps {
  /** Null until a link has been published: a proof is private until its holder shares it. */
  publication: ProofPublication | null
  onPublish: () => void
  onRevoke: () => void
  isPublishing: boolean
  /** The domain left the list, so the section says what that did and did not do to the link. */
  archived?: boolean
}

export const ProofActions = ({
  publication,
  onPublish,
  onRevoke,
  isPublishing,
  archived = false,
}: ProofActionsProps) => (
  <section className="overflow-hidden rounded-xl border border-border bg-card">
    {archived ? (
      <p className="border-border border-b bg-muted px-4 py-[11px] text-[12.5px] text-muted-foreground leading-[1.5]">
        {ARCHIVED_NOTE}
      </p>
    ) : null}
    {publication === null ? (
      <Action
        icon={<Link2 />}
        label="Publish a public link"
        onClick={onPublish}
        pending={isPublishing}
        disabled={archived}
      />
    ) : (
      <>
        <CopyAction icon={<Link2 />} label="Copy public link" value={publication.link} />
        <CopyAction icon={<Code2 />} label="Embed a badge" value={publication.badge} />
        <a href={publication.url} target="_blank" rel="noreferrer" className={ROW}>
          <span className="flex shrink-0 text-muted-foreground [&_svg]:size-[15px]">
            <ExternalLink />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">
            Open the proof page
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </a>
        <Action icon={<Unlink />} label="Stop sharing this link" onClick={onRevoke} />
      </>
    )}
  </section>
)
