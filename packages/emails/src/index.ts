import { render } from "@react-email/components"
import { MagicLinkEmail } from "./templates/magic-link.tsx"

export type RenderedEmail = {
  readonly subject: string
  readonly html: string
  readonly text: string
}

export type MagicLinkInput = {
  readonly url: string
  readonly expiresInMinutes: number
}

export async function renderMagicLinkEmail(input: MagicLinkInput): Promise<RenderedEmail> {
  const element = MagicLinkEmail(input)

  return {
    subject: "Sign in to ownsi",
    html: await render(element),
    text: await render(element, { plainText: true }),
  }
}
