import { ArrowRightIcon, Button, Input } from "@ownsi/ui"
import { CornerDownLeft, Plus } from "lucide-react"
import { useId, useState } from "react"
import { useAutoFocus } from "../hooks/useAutoFocus.ts"
import { parseClaimInput } from "../lib/domain.utils.ts"
import { ProviderGlyph } from "./ProviderGlyph.component.tsx"

const SUBMIT_BEAT_MS = 1000

export interface DomainFieldProps {
  onSubmit: (domain: string) => void
  /** Whatever the caller does with the name, while it is still doing it. */
  pending?: boolean
}

export const DomainField = ({ onSubmit, pending = false }: DomainFieldProps) => {
  const [value, setValue] = useState("")
  const [dismissed, setDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const listId = useId()
  const field = useAutoFocus<HTMLInputElement>()

  const parsed = parseClaimInput(value)
  const suggesting = parsed.email !== null && parsed.domain !== null && !dismissed

  return (
    <form
      className="relative flex w-full max-w-[466px] items-start gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const domain = parsed.domain
        if (!domain || submitting) return

        setSubmitting(true)
        setTimeout(() => {
          setSubmitting(false)
          onSubmit(domain)
        }, SUBMIT_BEAT_MS)
      }}
    >
      <div className="relative flex-1">
        <Input
          ref={field}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setDismissed(false)
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && suggesting) {
              event.preventDefault()
              setDismissed(true)
            }
          }}
          placeholder="yourcompany.com"
          aria-label="Domain or work email"
          aria-describedby={suggesting ? listId : undefined}
          autoComplete="off"
          spellCheck={false}
          className="text-left"
        />

        {suggesting ? (
          <div
            id={listId}
            className="absolute top-[calc(100%+4px)] left-0 z-20 w-full rounded-lg border border-border bg-popover p-[5px] text-left shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]"
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
      </div>

      <Button
        type="submit"
        disabled={!parsed.domain}
        pending={submitting || pending}
        icon={<ArrowRightIcon />}
      >
        Claim
      </Button>
    </form>
  )
}
