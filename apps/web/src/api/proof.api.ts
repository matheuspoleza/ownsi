import type { ProofLink } from "@ownsi/sdk"
import { ownsi } from "./ownsi.client.ts"

export type { ProofLink, ProofLinkStanding } from "@ownsi/sdk"

export const PROOF_LINKS_KEY = ["proof-links"] as const

export const proofLinksKey = (claimId: string | null) => [...PROOF_LINKS_KEY, claimId] as const

export const listProofLinks = (claimId: string): Promise<readonly ProofLink[]> =>
  ownsi.proof.list(claimId)

export const publishProofLink = (claimId: string): Promise<ProofLink> =>
  ownsi.proof.publish(claimId)

export const revokeProofLink = (link: ProofLink): Promise<ProofLink> => link.revoke()
