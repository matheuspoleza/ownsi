import { useQuery } from "@tanstack/react-query"
import {
  type Claim,
  type ClaimDetail,
  claimKey,
  claimsKey,
  domainNameKey,
  listClaims,
  listDomains,
  readClaim,
} from "../api/claim.api.ts"

export interface UseClaimStateOptions {
  domain: string
  enabled: boolean
}

export interface UseClaimStateResult {
  /** The claim in play — the open one, or the last one this account made on the name. */
  claim: ClaimDetail | null
  earlier: readonly Claim[]
  isResolving: boolean
}

const NO_CLAIMS: readonly Claim[] = []

const claimsOn = (domainId: string | null) =>
  domainId === null ? Promise.resolve(NO_CLAIMS) : listClaims(domainId)

const UNCLAIMED = "unclaimed"

const detailOf = (claimId: string | null) =>
  claimId === null ? Promise.resolve(null) : readClaim(claimId)

export const useClaimState = ({ domain, enabled }: UseClaimStateOptions): UseClaimStateResult => {
  const named = useQuery({
    queryKey: domainNameKey(domain),
    queryFn: () => listDomains({ name: domain }),
    enabled,
  })

  const domainId = named.data?.domains[0]?.id ?? null

  const claims = useQuery({
    queryKey: claimsKey(domainId ?? UNCLAIMED),
    queryFn: () => claimsOn(domainId),
    enabled: enabled && domainId !== null,
  })

  const [latest, ...earlier] = claims.data ?? NO_CLAIMS

  const detail = useQuery({
    queryKey: claimKey(latest?.id ?? null),
    queryFn: () => detailOf(latest?.id ?? null),
    enabled: enabled && latest !== undefined,
  })

  const resolvingDomain = enabled && named.isPending
  const resolvingClaims = domainId !== null && claims.isPending
  const resolvingDetail = latest !== undefined && detail.isPending

  return {
    claim: detail.data ?? null,
    earlier,
    isResolving: resolvingDomain || resolvingClaims || resolvingDetail,
  }
}
