import { useMagicLinkSend } from "../hooks/useMagicLinkSend.ts"
import { CheckEmailCard } from "./CheckEmailCard.component.tsx"
import { LogInCard } from "./LogInCard.component.tsx"

const SEND_FAILED = "We could not send that link. Try again."

export interface MagicLinkPanelProps {
  title: string
  description: string
  /** The claim the emailed link should open on, when the person started from one. */
  domain?: string
}

export const MagicLinkPanel = ({ title, description, domain }: MagicLinkPanelProps) => {
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
    <LogInCard
      title={title}
      description={description}
      domain={domain}
      pending={magicLink.isSending}
      error={magicLink.hasFailed ? SEND_FAILED : null}
      onSubmit={magicLink.send}
    />
  )
}
