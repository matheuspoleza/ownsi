import type { ProofLink } from "./proof-link.ts"

export type ProofLinkRepository = {
  readonly findBySlug: (slug: string) => Promise<ProofLink | null>
  readonly listByClaim: (claimId: string) => Promise<readonly ProofLink[]>
  readonly save: (link: ProofLink) => Promise<void>
}

export type ProvedClaim = {
  readonly claimId: string
  readonly archived: boolean
  readonly domain: string
  readonly unicodeDomain: string
  readonly heldBy: string
  readonly token: string
  readonly challengeHost: string
  readonly provedAt: Date
}

/**
 * The claim a link is minted from, or null when it is not this account's or was never
 * proved. A link is only ever a share of something already true. `archived` is carried
 * rather than filtered on: a revoked link is still readable, and only minting is refused.
 */
export type FindProvedClaim = (input: {
  readonly userId: string
  readonly email: string
  readonly claimId: string
}) => Promise<ProvedClaim | null>

/**
 * Whether the account still publishes the claim behind a link. Read on every open, so a
 * link that outlived the decision to publish it — an archived domain, a revocation that
 * never landed — stops resolving on the strength of the record rather than of an event.
 */
export type IsPublished = (claimId: string) => Promise<boolean>

/**
 * When the newest proof of this name was earned, whoever earned it, or null when nobody has.
 * Read on every open: it is a fact about the name, and the name goes on being proved.
 */
export type FindLatestProof = (domain: string) => Promise<Date | null>

/** Named once, when the link goes out. Nothing reads it again — the page states a moment. */
export type ReadProvider = (domain: string) => Promise<string | null>

export type GenerateSlug = () => string
