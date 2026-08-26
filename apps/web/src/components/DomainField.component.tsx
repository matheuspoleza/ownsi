import { GlobeIcon } from "@ownsi/ui"
import { CornerDownLeft, Plus } from "lucide-react"
import { useId, useState } from "react"
import { parseClaimInput } from "../lib/domain.utils.ts"
import { FieldBar } from "./FieldBar.component.tsx"
import { ProviderGlyph } from "./ProviderGlyph.component.tsx"

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
}

export const DomainField = ({
  onSubmit,
  onValueChange,
  pending = false,
  invalid = false,
  submitLabel = "Claim",
}: DomainFieldProps) => {
  const [value, setValue] = useState("")
  const [dismissed, setDismissed] = useState(false)
  const listId = useId()

  const parsed = parseClaimInput(value)
  const suggesting = parsed.email !== null && parsed.domain !== null && !dismissed && !pending

  return (
    <FieldBar
      value={value}
      onValueChange={(next) => {
        setValue(next)
        setDismissed(false)
        onValueChange?.(next)
      }}
      onSubmit={() => {
        if (parsed.domain) onSubmit(parsed.domain)
      }}
      ready={parsed.domain !== null}
      icon={<GlobeIcon className="size-4" strokeWidth={1.6} />}
      submitLabel={submitLabel}
      placeholder="yourcompany.com"
      label="Domain or work email"
      pending={pending}
      invalid={invalid}
      describedBy={suggesting ? listId : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && suggesting) {
          event.preventDefault()
          setDismissed(true)
        }
      }}
    >
      {suggesting ? (
        <div
          id={listId}
          className="absolute top-[calc(100%+4px)] left-0 z-50 w-full rounded-lg border border-border bg-popover p-[5px] text-left shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]"
        >
          <p className="px-[9px] pt-[7px] pb-[5px] font-medium text-[11px] text-muted-foreground tracking-[0.3px]">
            From your email
          </p>

          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-[9px] rounded-sm bg-accent px-[9px] py-2 text-left transition-colors hover:bg-accent active:bg-border"
          >
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-sm border border-border bg-card">
              <ProviderGlyph provider="cloudflare" className="size-3" />
            </span>
            <span className="font-medium text-[13.5px] text-foreground">{parsed.domain}</span>
            <span className="truncate text-[12px] text-muted-foreground">{parsed.email}</span>
            <span className="ml-auto flex size-[19px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
              <CornerDownLeft className="size-2.5" />
            </span>
          </button>

          <div className="my-[5px] h-px bg-border" />

          <p className="flex items-center gap-1.5 px-[9px] pt-[2px] pb-[7px] text-[12px] text-muted-foreground">
            <Plus className="size-3" />
            Or type any domain you control
          </p>
        </div>
      ) : null}
    </FieldBar>
  )
}
