import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  ALL_CLAIMS_KEY,
  type Claim,
  type DomainCounts,
  type DomainPage,
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
import {
  type DomainFilter,
  type DomainStatus,
  type DomainTab,
  STATUS_ORDER,
} from "../../../lib/status.constants.ts"
import { domainStatus } from "../../../lib/status.utils.ts"
import { DOMAINS_PER_BATCH } from "../Domains.constants.ts"

export interface DomainRow {
  listed: ListedDomain
  verification: Verification | null
  status: DomainStatus
}

export interface UseDashboardStateResult {
  /** Every row read so far, oldest batch first — the list never turns a page back. */
  rows: readonly DomainRow[]
  counts: DomainCounts | null
  proofs: readonly Claim[]
  filter: DomainTab | null
  select: (tab: DomainTab | null) => void
  /** The row the proof panel is reading. Falls back to the first row on screen. */
  selected: DomainRow | null
  /** The proof the selected row holds, when it holds one. */
  selectedProof: Claim | null
  selectRow: (domainId: string) => void
  isResolving: boolean
  /** How many domains the filter matches on the account, not how many have been read. */
  total: number
  hasMore: boolean
  isReadingMore: boolean
  readMore: () => void
}

const NO_PAGES: readonly DomainPage[] = []
const NO_CLAIMS: readonly Claim[] = []

const SAFETY_NET_MS = 60_000

export interface UseDashboardStateOptions {
  enabled: boolean
}

export const useDashboardState = ({
  enabled,
}: UseDashboardStateOptions): UseDashboardStateResult => {
  const [filter, setFilter] = useState<DomainTab | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const shelved = filter === "archived"

  const page = useInfiniteQuery({
    queryKey: domainsKey(filter),
    queryFn: ({ pageParam }) =>
      listDomains({
        status: statusOf(filter),
        archived: shelved,
        cursor: pageParam ?? undefined,
        limit: DOMAINS_PER_BATCH,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
    enabled,
  })

  const claims = useQuery({ queryKey: ALL_CLAIMS_KEY, queryFn: () => listClaims(), enabled })

  const pages = page.data?.pages ?? NO_PAGES
  const read = pages.flatMap((one) => one.domains)
  const open = read.filter((one) => one.status === "pending" && one.verificationId !== null)

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

  const rows = read.map((listed): DomainRow => {
    const verification = runningOn.get(listed.id) ?? null

    return {
      listed,
      verification,
      status: domainStatus(listed.status, verification, listed.archived),
    }
  })

  const proofs = (claims.data ?? NO_CLAIMS).filter((claim) => claim.state === "proved")
  const selected = rows.find((row) => row.listed.id === selectedId) ?? rows[0] ?? null
  const selectedProof = proofs.find((claim) => claim.domain === selected?.listed.name) ?? null

  const counts = pages[0]?.counts ?? null

  return {
    rows,
    counts,
    proofs,
    filter,
    select: (tab) => {
      setFilter(tab)
      setSelectedId(null)
    },
    selected,
    selectedProof,
    selectRow: setSelectedId,
    isResolving: enabled && page.isPending,
    total: counts === null ? 0 : held(counts, filter),
    hasMore: page.hasNextPage,
    isReadingMore: page.isFetchingNextPage,
    readMore: () => {
      void page.fetchNextPage()
    },
  }
}

const statusOf = (filter: DomainTab | null): DomainFilter | undefined =>
  filter === null || filter === "archived" ? undefined : filter

const held = (counts: DomainCounts, filter: DomainTab | null): number =>
  filter === null
    ? STATUS_ORDER.reduce((total, status) => total + counts[status], 0)
    : counts[filter]
