import { cn, Skeleton } from "@ownsi/ui"
import { Navigate, useNavigate } from "@tanstack/react-router"
import { Page } from "../../components/Page.component.tsx"
import { useClaimStart } from "../../hooks/useClaimStart.ts"
import { useNow } from "../../hooks/useNow.ts"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { STATUS_ORDER } from "../../lib/status.constants.ts"
import { DomainsHeading } from "./components/DomainsHeading.component.tsx"
import { DomainTable } from "./components/DomainTable.component.tsx"
import { NoDomainsYet } from "./components/NoDomainsYet.component.tsx"
import { ProofPanel } from "./components/ProofPanel.component.tsx"
import { StatusFilter, type StatusTab } from "./components/StatusFilter.component.tsx"
import { ROWS_BEFORE_RAIL } from "./Domains.constants.ts"
import { useDashboardState } from "./hooks/useDashboardState.ts"
import { useScrollEnd } from "./hooks/useScrollEnd.ts"

const TICK_MS = 1_000

const NO_RESULTS = "No domain is in that state right now."

const RAIL = "xl:grid xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-x-9"

const RAILED_PANEL = "xl:sticky xl:top-8 xl:col-start-2 xl:row-start-2 xl:pt-0"

export const DomainsPage = () => {
  const navigate = useNavigate()
  const { account, isResolving: isResolvingSession } = useSessionState()

  const signedIn = account !== null
  const {
    rows,
    counts,
    proofs,
    filter,
    select,
    selected,
    selectedProof,
    selectRow,
    isResolving,
    total,
    hasMore,
    isReadingMore,
    readMore,
  } = useDashboardState({ enabled: signedIn })
  const open = (claimed: string) =>
    navigate({ to: "/domains/$domain", params: { domain: claimed } })
  const start = useClaimStart({ onOpen: open })
  const now = useNow(TICK_MS)
  const end = useScrollEnd({ enabled: hasMore && !isReadingMore, onReach: readMore })

  const settled = signedIn && !isResolving
  const held = counts === null ? 0 : STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0)
  const onAccount = held + (counts?.archived ?? 0)
  const railed = held > ROWS_BEFORE_RAIL

  const tabs: readonly StatusTab[] =
    counts === null
      ? []
      : [
          { tab: null, count: held },
          ...STATUS_ORDER.flatMap((status) =>
            counts[status] > 0 ? [{ tab: status, count: counts[status] }] : [],
          ),
          ...(counts.archived > 0 ? [{ tab: "archived" as const, count: counts.archived }] : []),
        ]

  if (!isResolvingSession && !signedIn) return <Navigate to="/log-in" />

  return (
    <Page logIn={false}>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col px-6">
        {signedIn ? (
          <DomainsHeading
            rows={rows}
            onClaim={start.start}
            onOpen={open}
            onEdit={start.clearFailure}
            pending={start.isStarting}
            failure={start.failure?.message ?? null}
          />
        ) : null}

        {signedIn && isResolving ? <Skeleton className="mt-8 h-[260px] w-full rounded-xl" /> : null}

        {settled && onAccount > 0 ? (
          <div className={cn("flex flex-col gap-3 pt-8", railed && RAIL)}>
            <StatusFilter tabs={tabs} selected={filter} onSelect={select} />

            <div className="flex flex-col gap-3 xl:col-start-1 xl:row-start-2">
              {rows.length > 0 ? (
                <DomainTable
                  rows={rows}
                  now={now}
                  readingId={selected?.listed.id ?? null}
                  readingMore={isReadingMore}
                  onRead={selectRow}
                  onOpen={open}
                />
              ) : filter === null ? (
                <NoDomainsYet archived={counts?.archived ?? 0} />
              ) : (
                <p className="pt-2 text-[13px] text-muted-foreground">{NO_RESULTS}</p>
              )}

              {hasMore ? (
                <div ref={end} className="flex h-9 items-center justify-center">
                  <span className="text-[12.5px] text-muted-foreground">
                    <span className="font-mono">{rows.length}</span> of{" "}
                    <span className="font-mono">{total}</span>
                  </span>
                </div>
              ) : null}
            </div>

            {selected ? (
              <div className={cn("pt-7", railed && RAILED_PANEL)}>
                <ProofPanel
                  row={selected}
                  claim={selectedProof}
                  ink={selectedProof === null ? 0 : proofs.indexOf(selectedProof)}
                  inRail={railed}
                  onOpen={open}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {settled && onAccount === 0 ? (
          <div className="pt-[26px]">
            <NoDomainsYet />
          </div>
        ) : null}
      </div>
    </Page>
  )
}
