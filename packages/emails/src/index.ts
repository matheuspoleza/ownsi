import { render } from "@react-email/components"
import type { ReactElement } from "react"
import { ClaimExpiringEmail } from "./templates/claim-expiring.tsx"
import { ClaimNudgeEmail } from "./templates/claim-nudge.tsx"
import { MagicLinkEmail } from "./templates/magic-link.tsx"
import { OtherAccountProvedEmail } from "./templates/other-account-proved.tsx"
import { ProofGrantedEmail } from "./templates/proof-granted.tsx"

export type RenderedEmail = {
  readonly subject: string
  readonly html: string
  readonly text: string
}

export type MagicLinkInput = {
  readonly url: string
  readonly expiresInMinutes: number
}

export type ProofGrantedInput = {
  readonly domain: string
  readonly provedAt: string
  readonly url: string
}

export type PendingClaimInput = {
  readonly domain: string
  readonly host: string
  readonly token: string
  readonly cause: string
  readonly fix: string
  readonly url: string
}

export type OtherAccountProvedInput = {
  readonly domain: string
  readonly url: string
}

export function renderMagicLinkEmail(input: MagicLinkInput): Promise<RenderedEmail> {
  return renderEmail("Sign in to ownsi", MagicLinkEmail(input))
}

export function renderProofGrantedEmail(input: ProofGrantedInput): Promise<RenderedEmail> {
  return renderEmail(`${input.domain} is proved`, ProofGrantedEmail(input))
}

export function renderClaimNudgeEmail(input: PendingClaimInput): Promise<RenderedEmail> {
  return renderEmail(`${input.domain} is still waiting on one record`, ClaimNudgeEmail(input))
}

export function renderClaimExpiringEmail(input: PendingClaimInput): Promise<RenderedEmail> {
  return renderEmail(`The window on ${input.domain} closes tomorrow`, ClaimExpiringEmail(input))
}

export function renderOtherAccountProvedEmail(
  input: OtherAccountProvedInput,
): Promise<RenderedEmail> {
  return renderEmail(`Another account proved ${input.domain}`, OtherAccountProvedEmail(input))
}

async function renderEmail(subject: string, element: ReactElement): Promise<RenderedEmail> {
  return {
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  }
}
