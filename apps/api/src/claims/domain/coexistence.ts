import type { Claim } from "./claim.ts"

/** What the repository knows: somebody else's proof of the same name. */
export type OtherProof = {
  readonly maskedEmail: string
  readonly provedAt: string
}

/**
 * What a claimant is told. The other account is named only once this claim is proved too:
 * before that, the fact that the name has been proved is the whole of what is owed.
 */
export type Coexistence =
  | { readonly type: "unnamed" }
  | { readonly type: "named"; readonly maskedEmail: string; readonly provedAt: string }

export function coexistenceFor(other: OtherProof | null, claim: Claim): Coexistence | null {
  if (other === null) return null
  if (claim.state !== "proved") return { type: "unnamed" }

  return { type: "named", maskedEmail: other.maskedEmail, provedAt: other.provedAt }
}
