import { Resend } from "resend"

export type MailerDriver = "resend" | "log"

export type MailerConfig = {
  readonly driver: MailerDriver
  readonly apiKey: string
  readonly from: string
}

export type EmailMessage = {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly text: string
}

export type SendEmail = (message: EmailMessage) => Promise<void>

export function createSendEmail(config: MailerConfig): SendEmail {
  return config.driver === "log" ? loggedEmail() : resendEmail(config)
}

function loggedEmail(): SendEmail {
  return async ({ to, subject }) => {
    console.log(`email to ${to}: ${subject}`)
  }
}

function resendEmail(config: MailerConfig): SendEmail {
  const resend = new Resend(config.apiKey)

  return async ({ to, subject, html, text }) => {
    const { error } = await resend.emails.send({ from: config.from, to, subject, html, text })

    if (error) throw new Error(`Resend refused "${subject}": ${error.message}`)
  }
}
