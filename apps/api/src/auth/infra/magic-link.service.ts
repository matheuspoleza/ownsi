import { renderMagicLinkEmail } from "@ownsi/emails"
import type { SendEmail } from "../../shared/email.ts"
import type { SendMagicLink } from "../domain/ports.ts"

export function createSendMagicLink(sendEmail: SendEmail): SendMagicLink {
  return async ({ email, url, expiresInMinutes }) => {
    const rendered = await renderMagicLinkEmail({ url, expiresInMinutes })

    await sendEmail({ to: email, ...rendered })
  }
}
