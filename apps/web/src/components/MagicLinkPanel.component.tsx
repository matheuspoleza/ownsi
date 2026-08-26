import { useMagicLinkSend } from "../hooks/useMagicLinkSend.ts"
import { CheckEmailCard } from "./CheckEmailCard.component.tsx"
import { EmailField } from "./EmailField.component.tsx"

const SEND_FAILED = "We could not send that link. Try again."

export interface MagicLinkPanelProps {
  /** What the link is for, when the page has not already said it. */
  description?: string
  /** A heading, for a panel that stands on its own rather than under a hero. */
  title?: string
  /** The claim the emailed link should open on, when the person started from one. */
  domain?: string
}

export const MagicLinkPanel = ({ description, title, domain }: MagicLinkPanelProps) => {
  const magicLink = useMagicLinkSend({ domain })

  if (magicLink.sentTo) {
    return (
      <CheckEmailCard
        email={magicLink.sentTo}
        domain={domain}
        onUseAnother={magicLink.useAnotherAddress}
      />
    )
  }

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-[14px] text-center">
      {title ? (
        <h2 className="font-semibold text-[15px] text-foreground tracking-[-0.2px]">{title}</h2>
      ) : null}

      {description ? (
        <p className="font-body text-[14.5px] text-muted-foreground leading-[1.5]">{description}</p>
      ) : null}

      <EmailField
        domain={domain}
        pending={magicLink.isSending}
        invalid={magicLink.hasFailed}
        onSubmit={magicLink.send}
      />

      {magicLink.hasFailed ? (
        <p role="alert" className="text-[12px] text-error">
          {SEND_FAILED}
        </p>
      ) : null}
    </div>
  )
}
