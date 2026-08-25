import { useQueries, useQuery } from "@tanstack/react-query"
import {
  ALL_CLAIMS_KEY,
  type Claim,
  DOMAINS_KEY,
  type Domain,
  listClaims,
  listDomains,
} from "../../../api/claim.api.ts"
import {
  readVerification,
  type Verification,
  verificationKey,
} from "../../../api/verification.api.ts"

export interface OpenClaim {
  claim: Claim
  domain: Domain
  verification: Verification | null
}

export interface ProvedClaim {
  claim: Claim
  domain: Domain
}

export interface DomainSummary {
  domain: Domain
  /** How the last attempt on this name ended, or null before the first one. */
  latest: Claim | null
}

export interface UseDashboardStateResult {
  open: readonly OpenClaim[]
  proved: readonly ProvedClaim[]
  domains: readonly DomainSummary[]
  isResolving: boolean
}

const NO_DOMAINS: readonly Domain[] = []
const NO_CLAIMS: readonly Claim[] = []

const POLL_MS = 10_000

export interface UseDashboardStateOptions {
  enabled: boolean
}

export const useDashboardState = ({
  enabled,
}: UseDashboardStateOptions): UseDashboardStateResult => {
  const domains = useQuery({ queryKey: DOMAINS_KEY, queryFn: listDomains, enabled })
  const claims = useQuery({ queryKey: ALL_CLAIMS_KEY, queryFn: () => listClaims(), enabled })

  const byId = new Map((domains.data ?? NO_DOMAINS).map((domain) => [domain.id, domain]))
  const found = claims.data ?? NO_CLAIMS

  const pending = found.filter((claim) => claim.state === "pending")

  const verifications = useQueries({
    queries: pending.map((claim) => ({
      queryKey: verificationKey(claim.verificationId),
      queryFn: () =>
        claim.verificationId === null
          ? Promise.resolve(null)
          : readVerification(claim.verificationId),
      enabled: enabled && claim.verificationId !== null,
      refetchInterval: POLL_MS,
    })),
  })

  const open = pending.flatMap((claim, index) => {
    const domain = byId.get(claim.domainId)
    if (!domain) return []

    return [{ claim, domain, verification: verifications[index]?.data ?? null }]
  })

  const proved = found.flatMap((claim) => {
    const domain = byId.get(claim.domainId)
    return claim.state === "proved" && domain ? [{ claim, domain }] : []
  })

  return {
    open,
    proved,
    domains: (domains.data ?? NO_DOMAINS).map((domain) => ({
      domain,
      latest: found.find((claim) => claim.domainId === domain.id) ?? null,
    })),
    isResolving: enabled && (domains.isPending || claims.isPending),
  }
}
