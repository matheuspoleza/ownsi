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
}

const Action = ({ icon, label, onClick, pending = false }: ActionProps) => (
  <button type="button" onClick={onClick} disabled={pending} className={ROW}>
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

export interface ProofActionsProps {
  /** Null until a link has been published: a proof is private until its holder shares it. */
  publication: ProofPublication | null
  onPublish: () => void
  onRevoke: () => void
  isPublishing: boolean
}

export const ProofActions = ({
  publication,
  onPublish,
  onRevoke,
  isPublishing,
}: ProofActionsProps) => (
  <section className="overflow-hidden rounded-xl border border-border bg-card">
    {publication === null ? (
      <Action
        icon={<Link2 />}
        label="Publish a public link"
        onClick={onPublish}
        pending={isPublishing}
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
