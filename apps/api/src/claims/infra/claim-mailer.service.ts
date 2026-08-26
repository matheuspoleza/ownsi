import {
  type RenderedEmail,
  renderClaimExpiredEmail,
  renderClaimExpiringEmail,
  renderClaimNudgeEmail,
  renderClaimOpenedEmail,
  renderClaimProgressEmail,
  renderOtherAccountProvedEmail,
  renderProofGrantedEmail,
} from "@ownsi/emails"
import type { SendEmail } from "../../shared/email.ts"
import { unreachable } from "../../shared/result.ts"
import { challengeHost, explain } from "../../verification/verification.contract.ts"
import type { ClaimAnnouncement, FindRecipient, SendNotice } from "../domain/ports.ts"

export type ClaimMailerDeps = {
  readonly sendEmail: SendEmail
  readonly findRecipient: FindRecipient
  readonly appUrl: string
}

export function emailTheClaimant(deps: ClaimMailerDeps): SendNotice {
  return async (announcement) => {
    const recipient = await deps.findRecipient(announcement.userId)
    if (recipient === null) return

    const rendered = await compose(announcement, `${deps.appUrl}/domains/${announcement.domainId}`)

    await deps.sendEmail({ to: recipient.email, ...rendered })
  }
}

function compose(announcement: ClaimAnnouncement, url: string): Promise<RenderedEmail> {
  const { notice, domain } = announcement
  const host = challengeHost(domain)

  switch (notice.kind) {
    case "proved":
      return renderProofGrantedEmail({
        domain,
        provedAt: readable(notice.provedAt),
        url,
        proofUrl: notice.proofUrl,
      })
    case "coexistence":
      return renderOtherAccountProvedEmail({ domain, url })
    case "expired":
      return renderClaimExpiredEmail({ domain, url })
    case "opened":
      return renderClaimOpenedEmail({ domain, token: announcement.token, host, url })
    case "progress":
      return renderClaimProgressEmail(pending(announcement, notice.diagnosis, url))
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

const READABLE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function readable(instant: Date): string {
  return READABLE.format(instant)
}
