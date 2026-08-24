import { renderMagicLinkEmail } from "@ownsi/emails"
import { Resend } from "resend"

export type MagicLinkDelivery = {
  readonly email: string
  readonly url: string
  readonly expiresInMinutes: number
}

export type SendMagicLink = (delivery: MagicLinkDelivery) => Promise<void>

export type MailerDriver = "resend" | "log"

export type MailerConfig = {
  readonly driver: MailerDriver
  readonly apiKey: string
  readonly from: string
}

export function createSendMagicLink(config: MailerConfig): SendMagicLink {
  return config.driver === "log" ? loggedMagicLink() : resendMagicLink(config)
}

function loggedMagicLink(): SendMagicLink {
  return async ({ email, url }) => {
    console.log(`magic link for ${email}: ${url}`)
  }
}

function resendMagicLink(config: MailerConfig): SendMagicLink {
  const resend = new Resend(config.apiKey)

  return async ({ email, url, expiresInMinutes }) => {
    const { subject, html, text } = await renderMagicLinkEmail({ url, expiresInMinutes })

    const { error } = await resend.emails.send({
      from: config.from,
      to: email,
      subject,
      html,
      text,
    })

    if (error) throw new Error(`Resend refused the magic link: ${error.message}`)
  }
}
