import { authClient } from "./auth.client.ts"

export interface MagicLinkRequest {
  email: string
  /** The claim the link should open on, when the person started from one. */
  domain?: string
}

export interface MagicLinkResponse {
  email: string
}

const SEND_FAILED = "We could not send that link. Try again."

const landingFor = (domain?: string) => (domain ? `/claim/${domain}` : "/")

export const sendMagicLink = async ({
  email,
  domain,
}: MagicLinkRequest): Promise<MagicLinkResponse> => {
  const { error } = await authClient.signIn.magicLink({
    email,
    callbackURL: landingFor(domain),
  })

  if (error) throw new Error(error.message ?? SEND_FAILED)

  return { email }
}
