import { MailIcon } from "@ownsi/ui"
import { useState } from "react"
import { EMAIL } from "../lib/domain.constants.ts"
import { FieldBar } from "./FieldBar.component.tsx"

export interface EmailFieldProps {
  onSubmit: (email: string) => void
  /** The name being claimed, so the placeholder suggests an address at it. */
  domain?: string
  /** The link is on its way, or the address came back refused. */
  pending?: boolean
  invalid?: boolean
}

export const EmailField = ({
  onSubmit,
  domain,
  pending = false,
  invalid = false,
}: EmailFieldProps) => {
  const [email, setEmail] = useState("")

  return (
    <FieldBar
      value={email}
      onValueChange={setEmail}
      onSubmit={(submitted) => onSubmit(submitted.trim().toLowerCase())}
      ready={EMAIL.test(email.trim())}
      icon={<MailIcon className="size-4" strokeWidth={1.6} />}
      submitLabel="Send link"
      placeholder={`you@${domain ?? "acme.com"}`}
      label="Work email"
      type="email"
      autoComplete="email"
      pending={pending}
      invalid={invalid}
    />
  )
}
