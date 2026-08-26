import { type Treaty, unwrap } from "./client.ts"
import { ownsiError } from "./error.ts"
import { listProofLinks, type ProofLink, publishProofLink } from "./proof.ts"
import { readVerification, runVerification, type Verification } from "./verifications.ts"

type ClaimRequest = ReturnType<Treaty["claims"]>

export type ClaimDetailData = NonNullable<Awaited<ReturnType<ClaimRequest["get"]>>["data"]>

export type ClaimData = NonNullable<
  Awaited<ReturnType<Treaty["claims"]["get"]>>["data"]
>["claims"][number]

export type ChallengeRecord = ClaimData["records"][number]

export type Coexistence = NonNullable<ClaimDetailData["coexistence"]>

export type ClaimState = ClaimData["state"]

type ClaimActions = {
  /** The one TXT record to create, or null once the claim has ended. */
  readonly record: ChallengeRecord | null
  /** The process running against this claim. Throws only if the handoff never completed. */
  readonly verification: () => Promise<Verification>
  /** Reads DNS now instead of waiting for the schedule. Rate limited per verification. */
  readonly recheck: () => Promise<Verification>
  readonly cancel: () => Promise<Claim>
  /** Publishes a public link to this proof, or hands back the one already live. */
  readonly share: () => Promise<ProofLink>
  /** Every link ever published on it, expired and revoked included. */
  readonly shares: () => Promise<readonly ProofLink[]>
  readonly refresh: () => Promise<ClaimDetail>
}

export type Claim = ClaimData & ClaimActions

/** What `get` and `create` answer with: a claim, plus whether another account proved the name. */
export type ClaimDetail = ClaimDetailData & ClaimActions

export type Claims = {
  readonly get: (claimId: string) => Promise<ClaimDetail>
  readonly list: (options?: { readonly domainId?: string }) => Promise<readonly Claim[]>
  readonly create: (domainId: string) => Promise<ClaimDetail>
}

const NO_VERIFICATION =
  "This claim has no verification behind it, so there is nothing to read or run."

export function claims(api: Treaty): Claims {
  return {
    get: (claimId) => readClaim(api, claimId),
    list: async ({ domainId } = {}) => {
      const { claims: found } = await unwrap(api.claims.get({ query: { domainId } }))
      return found.map((claim) => asClaim(api, claim))
    },
    create: (domainId) => createClaim(api, domainId),
  }
}

export async function createClaim(api: Treaty, domainId: string): Promise<ClaimDetail> {
  return asClaimDetail(api, await unwrap(api.claims.post({ domainId })))
}

export async function readClaim(api: Treaty, claimId: string): Promise<ClaimDetail> {
  return asClaimDetail(api, await unwrap(api.claims({ id: claimId }).get()))
}

export function asClaim(api: Treaty, data: ClaimData): Claim {
  return { ...data, ...actions(api, data) }
}

export function asClaimDetail(api: Treaty, data: ClaimDetailData): ClaimDetail {
  return { ...data, ...actions(api, data) }
}

function actions(api: Treaty, data: ClaimData): ClaimActions {
  const behind = () => {
    const { verificationId } = data
    if (verificationId === null) throw ownsiError("verification_not_found", NO_VERIFICATION)
    return verificationId
  }

  return {
    record: data.records[0] ?? null,
    verification: async () => readVerification(api, behind()),
    recheck: async () => runVerification(api, behind()),
    refresh: () => readClaim(api, data.id),
    cancel: async () => asClaim(api, await unwrap(api.claims({ id: data.id }).cancel.post())),
    share: () => publishProofLink(api, data.id),
    shares: () => listProofLinks(api, data.id),
  }
}
