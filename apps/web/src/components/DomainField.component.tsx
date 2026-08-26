import { GlobeIcon } from "@ownsi/ui"
import { CornerDownLeft, Plus } from "lucide-react"
import { useId, useState } from "react"
import { parseClaimInput } from "../lib/domain.utils.ts"
import { FieldBar } from "./FieldBar.component.tsx"
import { ProviderGlyph } from "./ProviderGlyph.component.tsx"

const POPOVER =
  "absolute top-[calc(100%+4px)] left-0 z-50 w-full rounded-lg border border-border bg-popover p-[5px] text-left shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]"

const ROW =
  "group flex w-full cursor-pointer items-center gap-[9px] rounded-sm px-[9px] py-2 text-left transition-colors active:bg-border"

const SQUARE =
  "flex size-[22px] shrink-0 items-center justify-center rounded-sm border border-border bg-card"

const RETURN_CHIP =
  "ml-auto flex size-[19px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground"

const CAPTION =
  "px-[9px] pt-[7px] pb-[5px] font-medium text-[11px] text-muted-foreground tracking-[0.3px]"

const NOTE = "px-[9px] pt-[2px] pb-[7px] text-[12px] text-muted-foreground"

const DEMO_NOTE = "Ownsi answers for this zone, so the record is published for you."

/** Clicking a row must not blur the field first, or the field closes the row out from under it. */
const keepFocus = (event: { preventDefault: () => void }) => event.preventDefault()

const matches = (domain: string, typed: string) => {
  const wanted = typed.trim().toLowerCase()
  return domain !== wanted && domain.includes(wanted)
}

export interface DomainFieldProps {
  onSubmit: (domain: string) => void
  /** Every keystroke, raw. For anything on the page that reacts to typing. */
  onValueChange?: (value: string) => void
  /** Whatever the caller does with the name, while it is still doing it. */
  pending?: boolean
  /** The last name typed here came back refused, and the field says so to a screen reader. */
  invalid?: boolean
  /** What the button offers to do with the name, when it is not a claim. */
  submitLabel?: string
  /** Names Ownsi answers for itself, offered when the field is reached for. */
  demoDomains?: readonly string[]
}

export const DomainField = ({
  onSubmit,
  onValueChange,
  pending = false,
  invalid = false,
  submitLabel = "Claim",
  demoDomains = [],
}: DomainFieldProps) => {
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
  const listId = useId()

  const parsed = parseClaimInput(value)
  const fromEmail = parsed.email !== null && parsed.domain !== null
  const offered = fromEmail ? [] : demoDomains.filter((domain) => matches(domain, value))
  const suggesting = open && !pending && (fromEmail || offered.length > 0)

  return (
    <FieldBar
      value={value}
      onValueChange={(next) => {
        setValue(next)
        setOpen(true)
        onValueChange?.(next)
      }}
      onSubmit={(submitted) => {
        const { domain } = parseClaimInput(submitted)
        if (domain) onSubmit(domain)
      }}
      ready={parsed.domain !== null}
      icon={<GlobeIcon className="size-4" strokeWidth={1.6} />}
      submitLabel={submitLabel}
      placeholder="yourcompany.com"
      label="Domain or work email"
      pending={pending}
      invalid={invalid}
      describedBy={suggesting ? listId : undefined}
      onReach={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && suggesting) {
          event.preventDefault()
          setOpen(false)
        }
      }}
    >
      {(commit) =>
        suggesting ? (
          <div id={listId} className={POPOVER}>
            {fromEmail ? (
              <>
                <p className={CAPTION}>From your email</p>

                <button type="submit" onMouseDown={keepFocus} className={`${ROW} bg-accent`}>
                  <span className={SQUARE}>
                    <ProviderGlyph provider="cloudflare" className="size-3" />
                  </span>
                  <span className="font-medium text-[13.5px] text-foreground">{parsed.domain}</span>
                  <span className="truncate text-[12px] text-muted-foreground">{parsed.email}</span>
                  <span className={RETURN_CHIP}>
                    <CornerDownLeft className="size-2.5" />
                  </span>
                </button>

                <div className="my-[5px] h-px bg-border" />

                <p className={`flex items-center gap-1.5 ${NOTE}`}>
                  <Plus className="size-3" />
                  Or type any domain you control
                </p>
              </>
            ) : (
              <>
                <p className={CAPTION}>Ours to answer for</p>

                {offered.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onMouseDown={keepFocus}
                    onClick={() => commit(domain)}
                    className={`${ROW} hover:bg-accent`}
                  >
                    <span className={SQUARE}>
                      <GlobeIcon className="size-3" strokeWidth={1.6} />
                    </span>
                    <span className="font-mono text-[13.5px] text-foreground">{domain}</span>
                    <span
                      className={`${RETURN_CHIP} opacity-0 transition-opacity group-hover:opacity-100`}
                    >
                      <CornerDownLeft className="size-2.5" />
                    </span>
                  </button>
                ))}

                <div className="my-[5px] h-px bg-border" />

                <p className={NOTE}>{DEMO_NOTE}</p>
              </>
            )}
          </div>
        ) : null
      }
    </FieldBar>
  )
}
