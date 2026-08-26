export type Attestation = {
  readonly domain: string
  readonly unicodeDomain: string
  /** The holder as a stranger may see them: masked local part, visible host. */
  readonly heldBy: string
  readonly token: string
  readonly provedAt: Date
}
