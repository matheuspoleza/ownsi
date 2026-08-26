import {
  AnimateIcon,
  Button,
  CheckIcon,
  CopyIcon,
  cn,
  ExternalLinkIcon,
  LinkIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ownsi/ui"
import { ChevronRight, Unlink } from "lucide-react"
import { type ReactNode, useState } from "react"
import { HelpTip } from "../../../components/HelpTip.component.tsx"
import { useCopy } from "../../../hooks/useCopy.ts"
import type { ProofPublication } from "../../../lib/proof.utils.ts"

const NOTE =
  "Anyone with the link can open it. The page states one moment and reads no DNS, so removing the record changes nothing about it."

const UNSHARED_NOTE =
  "Nothing is public until you ask for it. Once published, the address resolves until you take it back."

const ARCHIVED_NOTE =
  "Archiving took this domain's public links back, so those addresses stopped resolving. The proof stands as a record. Claim the domain again to prove it afresh and publish a new link — the old address does not return."

const PREVIEW_NOTE =
  "Nothing here is live yet. The link becomes yours to publish the moment the resolvers read the record back."

const PLACEHOLDER = "—"

const GLYPH =
  "mt-[2px] shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"

interface GlyphButtonProps {
  /** Read aloud on its own, so it names the thing as well as the act. */
  label: string
  /** What the pointer is told, where the block above already says which line this is. */
  tip?: string
  onClick: () => void
  children: ReactNode
}

const GlyphButton = ({ label, tip = label, onClick, children }: GlyphButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild onClick={onClick}>
      <AnimateIcon asChild animateOnHover>
        <button type="button" aria-label={label} className={GLYPH}>
          {children}
        </button>
      </AnimateIcon>
    </TooltipTrigger>
    <TooltipContent>{tip}</TooltipContent>
  </Tooltip>
)

interface GlyphLinkProps {
  label: string
  href: string
  children: ReactNode
}

const GlyphLink = ({ label, href, children }: GlyphLinkProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <AnimateIcon asChild animateOnHover>
        <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={GLYPH}>
          {children}
        </a>
      </AnimateIcon>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)

interface LineProps {
  label: string
  value: string | null
  /** Sits at the end of the row, before copy: what there is to do about this line right now. */
  children?: ReactNode
}

const Line = ({ label, value, children }: LineProps) => {
  const { copied, copy } = useCopy(value ?? "")

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-muted px-3.5 py-[11px]">
      <span
        className={cn(
          "min-w-0 flex-1 break-all font-mono text-[12px] leading-[1.5]",
          value === null ? "text-muted-foreground/70" : "text-foreground",
        )}
      >
        {value ?? PLACEHOLDER}
      </span>

      {children}

      {value === null ? (
        <CopyIcon className="mt-[2px] size-3.5 shrink-0 text-muted-foreground/50" />
      ) : (
        <GlyphButton label={`Copy ${label.toLowerCase()}`} tip="Copy" onClick={copy}>
          {copied ? (
            <CheckIcon className="size-3.5 text-success" animate />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </GlyphButton>
      )}
    </div>
  )
}

interface BlockProps {
  label: string
  value: string | null
  /** The one thing worth saying about this line, behind a mark so it says it once. */
  note: string
  children?: ReactNode
}

const Block = ({ label, value, note, children }: BlockProps) => (
  <div className="flex flex-col gap-[7px]">
    <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      {label}
      <HelpTip label={`About the ${label.toLowerCase()}`}>{note}</HelpTip>
    </span>

    <Line label={label} value={value}>
      {children}
    </Line>
  </div>
)

interface FoldProps {
  label: string
  value: string | null
}

const Fold = ({ label, value }: FoldProps) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="-mx-1 flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-[3px] text-[12px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")}
        />
        {label}
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="pt-[7px]">
            <Line label={label} value={value} />
          </div>
        </div>
      </div>
    </div>
  )
}

export interface ProofShareProps {
  /** Null until a link has been published — the line then shows the shape of the answer. */
  publication: ProofPublication | null
  onPublish: () => void
  onRevoke: () => void
  isPublishing: boolean
  /** The proof has not landed yet, so there is nothing anyone could publish. */
  preview?: boolean
  /** The domain left the list; the link did not, and the note is where that is said. */
  archived?: boolean
  /** What the domain on screen wants next, in the panel's own words. */
  action: ReactNode
}

const noteFor = ({
  preview,
  archived,
  published,
}: {
  preview: boolean
  archived: boolean
  published: boolean
}): string => {
  if (archived) return ARCHIVED_NOTE
  if (preview) return PREVIEW_NOTE

  return published ? NOTE : UNSHARED_NOTE
}

export const ProofShare = ({
  publication,
  onPublish,
  onRevoke,
  isPublishing,
  preview = false,
  archived = false,
  action,
}: ProofShareProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-4">
    <Block
      label="Public link"
      value={publication?.link ?? null}
      note={noteFor({ preview, archived, published: publication !== null })}
    >
      {publication === null ? (
        <AnimateIcon asChild animateOnHover>
          <Button
            size="icon"
            aria-label="Publish a public link"
            disabled={preview || archived}
            pending={isPublishing}
            onClick={onPublish}
            icon={<LinkIcon />}
            className="-mt-[3px] size-[26px] shrink-0 rounded-sm [&_svg]:size-3.5"
          />
        </AnimateIcon>
      ) : (
        <>
          <GlyphLink label="Open the proof page" href={publication.url}>
            <ExternalLinkIcon className="size-3.5" />
          </GlyphLink>

          <GlyphButton label="Stop sharing this link" onClick={onRevoke}>
            <Unlink className="size-3.5" />
          </GlyphButton>
        </>
      )}
    </Block>

    <div className="flex flex-col gap-[3px]">
      <Fold label="README badge" value={publication?.badge ?? null} />
      <Fold label="API read" value={publication?.api ?? null} />
    </div>

    <div className="flex flex-wrap items-center gap-2.5">{action}</div>
  </div>
)
