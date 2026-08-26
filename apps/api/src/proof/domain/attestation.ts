export type Attestation = {
  readonly domain: string
  readonly unicodeDomain: string
  /** The holder as a stranger may see them: masked local part, visible host. */
  readonly heldBy: string
  readonly token: string
  /** The host the token was written on, so a reader can run the lookup themselves. */
  readonly challengeHost: string
  /** Who served the zone when the link went out, or null when nobody could name them. */
  readonly provider: string | null
  readonly provedAt: Date
}
