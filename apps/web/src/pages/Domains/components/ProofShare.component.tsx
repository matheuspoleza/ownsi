import { AnimateIcon, Button, CheckIcon, CopyIcon, cn, ExternalLinkIcon, LinkIcon } from "@ownsi/ui"
import { useCopy } from "../../../hooks/useCopy.ts"
import type { ProofPublication } from "../../../lib/proof.utils.ts"

const NOTE =
  "Anyone with the link can open it. The page states one moment and reads no DNS, so removing the record changes nothing about it."

const UNSHARED_NOTE =
  "Nothing is public until you ask for it. A link resolves for seven days; the proof it points at never expires."

const PREVIEW_NOTE =
  "Nothing here is live yet. The link becomes yours to publish the moment the resolvers read the record back."

const PLACEHOLDER = "—"

interface BlockProps {
  label: string
  value: string | null
}

const Block = ({ label, value }: BlockProps) => {
  const { copied, copy } = useCopy(value ?? "")

  return (
    <div className="flex flex-col gap-[7px]">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted px-3.5 py-[11px]">
        <span
          className={cn(
            "min-w-0 flex-1 break-all font-mono text-[12px] leading-[1.5]",
            value === null ? "text-muted-foreground/70" : "text-foreground",
          )}
        >
          {value ?? PLACEHOLDER}
        </span>

        {value === null ? (
          <CopyIcon className="mt-[2px] size-3.5 shrink-0 text-muted-foreground/50" />
        ) : (
          <AnimateIcon asChild animateOnHover>
            <button
              type="button"
              onClick={copy}
              aria-label={`Copy ${label.toLowerCase()}`}
              className="mt-[2px] shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-success" animate />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </button>
          </AnimateIcon>
        )}
      </div>
    </div>
  )
}

export interface ProofShareProps {
  /** Null until a link has been published — the blocks then show the shape of the answer. */
  publication: ProofPublication | null
  onPublish: () => void
  onRevoke: () => void
  isPublishing: boolean
  /** The proof has not landed yet, so there is nothing anyone could publish. */
  preview?: boolean
}

export const ProofShare = ({
  publication,
  onPublish,
  onRevoke,
  isPublishing,
  preview = false,
}: ProofShareProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-4">
    <Block label="Public link" value={publication?.link ?? null} />
    <Block label="README badge" value={publication?.badge ?? null} />

    <div className="flex flex-wrap items-center gap-2.5">
      {publication === null ? (
        <AnimateIcon asChild animateOnHover>
          <Button
            size="sm"
            icon={<LinkIcon />}
            iconPosition="leading"
            disabled={preview}
            pending={isPublishing}
            onClick={onPublish}
          >
            <span className="font-mono lowercase">publish a public link</span>
          </Button>
        </AnimateIcon>
      ) : (
        <>
          <AnimateIcon asChild animateOnHover>
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLinkIcon />}
              iconPosition="leading"
              asChild
            >
              <a href={publication.url} target="_blank" rel="noreferrer">
                <span className="font-mono lowercase">open proof page</span>
              </a>
            </Button>
          </AnimateIcon>
          <button
            type="button"
            onClick={onRevoke}
            className="cursor-pointer font-mono text-[12px] text-muted-foreground lowercase transition-colors hover:text-foreground"
          >
            stop sharing
          </button>
        </>
      )}
    </div>

    <p className="text-[12px] text-muted-foreground">
      {preview ? PREVIEW_NOTE : publication === null ? UNSHARED_NOTE : NOTE}
    </p>
  </div>
)
