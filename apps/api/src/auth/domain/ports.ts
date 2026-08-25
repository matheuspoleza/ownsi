export type MagicLinkDelivery = {
  readonly email: string
  readonly url: string
  readonly expiresInMinutes: number
}

export type SendMagicLink = (delivery: MagicLinkDelivery) => Promise<void>
