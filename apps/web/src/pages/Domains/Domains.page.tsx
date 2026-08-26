import { Button, Skeleton } from "@ownsi/ui"
import { Navigate, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Page } from "../../components/Page.component.tsx"
import { useClaimStart } from "../../hooks/useClaimStart.ts"
import { useNow } from "../../hooks/useNow.ts"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { type DomainFilter, STATUS_ORDER } from "../../lib/status.constants.ts"
import { DomainsHeading } from "./components/DomainsHeading.component.tsx"
import { DomainTable } from "./components/DomainTable.component.tsx"
import { NoDomainsYet } from "./components/NoDomainsYet.component.tsx"
import { ProofPreview } from "./components/ProofPreview.component.tsx"
import { ProofsYouHold } from "./components/ProofsYouHold.component.tsx"
import { StatusFilter, type StatusTab } from "./components/StatusFilter.component.tsx"
import { awaitingName } from "./Domains.utils.ts"
import { useDashboardState } from "./hooks/useDashboardState.ts"

const TICK_MS = 1_000

const NO_RESULTS = "No domain is in that state right now."

const MORE = "Load more"

export const DomainsPage = () => {
  const navigate = useNavigate()
  const { account, isResolving: isResolvingSession } = useSessionState()
  const [filter, setFilter] = useState<DomainFilter | null>(null)

  const signedIn = account !== null
  const { rows, counts, proofs, isResolving, hasMore, isLoadingMore, loadMore } = useDashboardState(
    { enabled: signedIn, filter },
  )
  const open = (claimed: string) =>
    navigate({ to: "/domains/$domain", params: { domain: claimed } })
  const start = useClaimStart({ onOpen: open })
  const now = useNow(TICK_MS)

  const settled = signedIn && !isResolving
  const held =
    counts === null ? 0 : STATUS_ORDER.reduce((total, status) => total + counts[status], 0)

  const tabs: readonly StatusTab[] =
    counts === null
      ? []
      : [
          { status: null, count: held },
          ...STATUS_ORDER.flatMap((status) =>
            counts[status] > 0 ? [{ status, count: counts[status] }] : [],
          ),
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

        {settled && held > 0 ? (
          <div className="flex flex-col gap-3 pt-8">
            <StatusFilter tabs={tabs} selected={filter} onSelect={setFilter} />
            {rows.length > 0 ? (
              <DomainTable rows={rows} now={now} />
            ) : (
              <p className="pt-2 text-[13px] text-muted-foreground">{NO_RESULTS}</p>
            )}

            {hasMore ? (
              <div className="flex justify-center pt-1">
                <Button variant="outline" onClick={loadMore} pending={isLoadingMore}>
                  {MORE}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {settled && held === 0 ? (
          <div className="pt-[26px]">
            <NoDomainsYet />
          </div>
        ) : null}

        {settled && proofs.length === 0 ? <ProofPreview domain={awaitingName(rows)} /> : null}

        {settled && proofs.length > 0 ? <ProofsYouHold proofs={proofs} /> : null}
      </div>
    </Page>
  )
}
