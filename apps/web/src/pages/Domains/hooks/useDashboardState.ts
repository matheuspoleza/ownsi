import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query"
import {
  ALL_CLAIMS_KEY,
  type Claim,
  type DomainCounts,
  domainsKey,
  type ListedDomain,
  listClaims,
  listDomains,
} from "../../../api/claim.api.ts"
import {
  readVerification,
  type Verification,
  verificationKey,
} from "../../../api/verification.api.ts"
import type { DomainFilter, DomainStatus } from "../../../lib/status.constants.ts"
import { domainStatus } from "../../../lib/status.utils.ts"

export interface DomainRow {
  listed: ListedDomain
  verification: Verification | null
  status: DomainStatus
}

export interface UseDashboardStateResult {
  rows: readonly DomainRow[]
  counts: DomainCounts | null
  proofs: readonly Claim[]
  isResolving: boolean
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => void
}

const NO_ROWS: readonly ListedDomain[] = []
const NO_CLAIMS: readonly Claim[] = []

const SAFETY_NET_MS = 60_000

export interface UseDashboardStateOptions {
  enabled: boolean
  filter: DomainFilter | null
}

export const useDashboardState = ({
  enabled,
  filter,
}: UseDashboardStateOptions): UseDashboardStateResult => {
  const page = useInfiniteQuery({
    queryKey: domainsKey(filter),
    queryFn: ({ pageParam }) =>
      listDomains({ status: filter ?? undefined, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    enabled,
  })

  const claims = useQuery({ queryKey: ALL_CLAIMS_KEY, queryFn: () => listClaims(), enabled })

  const listed = page.data?.pages.flatMap((one) => one.domains) ?? NO_ROWS
  const open = listed.filter((one) => one.status === "pending" && one.verificationId !== null)

  const verifications = useQueries({
    queries: open.map((one) => ({
      queryKey: verificationKey(one.verificationId),
      queryFn: () =>
        one.verificationId === null ? Promise.resolve(null) : readVerification(one.verificationId),
      enabled: enabled && one.verificationId !== null,
      refetchInterval: SAFETY_NET_MS,
    })),
  })

  const runningOn = new Map(open.map((one, index) => [one.id, verifications[index]?.data ?? null]))

  const rows = listed.map((one) => {
    const verification = runningOn.get(one.id) ?? null

    return { listed: one, verification, status: domainStatus(one.status, verification) }
  })

  const proofs = (claims.data ?? NO_CLAIMS).filter((claim) => claim.state === "proved")

  return {
    rows,
    counts: page.data?.pages[0]?.counts ?? null,
    proofs,
    isResolving: enabled && page.isPending,
    hasMore: page.hasNextPage,
    isLoadingMore: page.isFetchingNextPage,
    loadMore: () => {
      void page.fetchNextPage()
    },
  }
}
