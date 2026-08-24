import type { Claim, NewClaim } from "./claim.ts"

export type ClaimRepository = {
  readonly findById: (userId: string, id: string) => Promise<Claim | null>
  readonly findByDomain: (userId: string, domain: string) => Promise<Claim | null>
  readonly listByUser: (userId: string) => Promise<readonly Claim[]>
  readonly save: (claim: Claim) => Promise<void>
}

export type GenerateToken = () => string

export type GenerateId = () => string

export type StartClaim = (params: NewClaim) => Claim
