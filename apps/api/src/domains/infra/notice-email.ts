import {
  type RenderedEmail,
  renderClaimExpiringEmail,
  renderClaimNudgeEmail,
  renderOtherAccountProvedEmail,
  renderProofGrantedEmail,
} from "@ownsi/emails"
import type { SendEmail } from "../../shared/email.ts"
import { unreachable } from "../../shared/result.ts"
import { challengeHost, explain } from "../../verification/verification.contract.ts"
import type { AnnounceClaim, ClaimAnnouncement, FindRecipient } from "../domain/ports.ts"

export type NoticeEmailDeps = {
  readonly sendEmail: SendEmail
  readonly findRecipient: FindRecipient
  readonly appUrl: string
}

export function emailTheClaimant(deps: NoticeEmailDeps): AnnounceClaim {
  return async (announcement) => {
    const recipient = await deps.findRecipient(announcement.userId)
    if (recipient === null) return

    const rendered = await compose(announcement, `${deps.appUrl}/domains/${announcement.domainId}`)

    await deps.sendEmail({ to: recipient.email, ...rendered })
  }
}

function compose(announcement: ClaimAnnouncement, url: string): Promise<RenderedEmail> {
  const { notice, domain } = announcement

  switch (notice.kind) {
    case "proved":
      return renderProofGrantedEmail({ domain, provedAt: readable(notice.provedAt), url })
    case "coexistence":
      return renderOtherAccountProvedEmail({ domain, url })
    case "nudge":
      return renderClaimNudgeEmail(pending(announcement, notice.diagnosis, url))
    case "expiring":
      return renderClaimExpiringEmail(pending(announcement, notice.diagnosis, url))
    default:
      return unreachable(notice)
  }
}

function pending(
  { domain, token }: ClaimAnnouncement,
  diagnosis: Parameters<typeof explain>[0],
  url: string,
) {
  return {
    domain,
    token,
    host: challengeHost(domain),
    url,
    ...explain(diagnosis, { domain, token }),
  }
}

function readable(instant: Date): string {
  return instant.toISOString().slice(0, 10)
}
