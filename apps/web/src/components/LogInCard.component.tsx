import { ArrowRightIcon, Button, Card, Input } from "@ownsi/ui"
import { useState } from "react"
import { useAutoFocus } from "../hooks/useAutoFocus.ts"

export interface LogInCardProps {
  title: string
  description: string
  /** Prefills the field when we already know which address to expect. */
  defaultEmail?: string
  /** The name being claimed, so the placeholder suggests an address at it. */
  domain?: string
  pending?: boolean
  error?: string | null
  onSubmit: (email: string) => void
}

export const LogInCard = ({
  title,
  description,
  defaultEmail = "",
  domain,
  pending = false,
  error = null,
  onSubmit,
}: LogInCardProps) => {
  const [email, setEmail] = useState(defaultEmail)
  const field = useAutoFocus<HTMLInputElement>()

  return (
    <Card className="w-full max-w-[470px] px-[22px] pt-[11px] pb-[18px] text-left">
      <div className="flex flex-col gap-3.5">
        <h2 className="font-semibold text-base text-foreground">{title}</h2>
        <p className="text-[13px] text-muted-foreground leading-[1.45]">{description}</p>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(email.trim())
          }}
        >
          <div className="flex items-start gap-2">
            <Input
              ref={field}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={`you@${domain ?? "acme.com"}`}
              aria-label="Work email"
              aria-invalid={error ? true : undefined}
              autoComplete="email"
              className="flex-1"
            />
            <Button type="submit" pending={pending} icon={<ArrowRightIcon />}>
              Send magic link
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-[12px] text-error">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </Card>
  )
}
