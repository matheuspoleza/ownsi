import type { Claim, ClaimDetail, Domain } from "@ownsi/sdk"
import { ownsi } from "./ownsi.client.ts"

export type {
  ChallengeRecord,
  Claim,
  ClaimDetail,
  ClaimState,
  Coexistence,
  Domain,
  OwnsiError,
} from "@ownsi/sdk"

export const DOMAINS_KEY = ["domains"] as const

export const CLAIMS_KEY = ["claims"] as const

export const CLAIM_KEY = ["claim"] as const

/** Every claim on the account. Deliberately not `claimsKey(null)`: one name, one meaning. */
export const ALL_CLAIMS_KEY = [...CLAIMS_KEY, "all"] as const

export const claimsKey = (domainId: string) => [...CLAIMS_KEY, "on", domainId] as const

export const claimKey = (claimId: string | null) => [...CLAIM_KEY, claimId] as const

export const listDomains = (): Promise<readonly Domain[]> => ownsi.domains.list()

export const findOrCreateDomain = (name: string): Promise<Domain> =>
  ownsi.domains.findOrCreate(name)

export const listClaims = (domainId?: string): Promise<readonly Claim[]> =>
  ownsi.claims.list({ domainId })

export const createClaim = (domainId: string): Promise<ClaimDetail> => ownsi.claims.create(domainId)

export const readClaim = (claimId: string): Promise<ClaimDetail> => ownsi.claims.get(claimId)

export const cancelClaim = (claim: Claim): Promise<Claim> => claim.cancel()
