export interface MagicLinkRequest {
  email: string
  /** The claim the link should open on, when the person started from one. */
  domain?: string
}

export interface MagicLinkResponse {
  email: string
}

export const sendMagicLink = async ({
  email,
  domain,
}: MagicLinkRequest): Promise<MagicLinkResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 700))
  console.info("[auth] magic link requested", { email, domain })
  return { email }
}
