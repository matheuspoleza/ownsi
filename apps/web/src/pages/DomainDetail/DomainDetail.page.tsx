import { Button, Skeleton } from "@ownsi/ui"
import { Navigate, useParams } from "@tanstack/react-router"
import { Page } from "../../components/Page.component.tsx"
import { useClaimStart } from "../../hooks/useClaimStart.ts"
import { useNow } from "../../hooks/useNow.ts"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { useZoneState } from "../../hooks/useZoneState.ts"
import { formatDate, formatDuration, secondsSince } from "../../lib/time.utils.ts"
import { ActivityTimeline } from "./components/ActivityTimeline.component.tsx"
import { type ActivityEntry, attemptEntry } from "./components/ActivityTimeline.utils.ts"
import { AutomaticChecks } from "./components/AutomaticChecks.component.tsx"
import { DomainFacts } from "./components/DomainFacts.component.tsx"
import { type DomainAction, DomainHeading } from "./components/DomainHeading.component.tsx"
import { OwnershipInstructions } from "./components/OwnershipInstructions.component.tsx"
import { OwnershipVerification } from "./components/OwnershipVerification.component.tsx"
import { messageTone, railSteps, statusPill, verificationMessage } from "./DomainDetail.utils.ts"
import { useAttemptsState } from "./hooks/useAttemptsState.ts"
import { useClaimCancel } from "./hooks/useClaimCancel.ts"
import { useClaimState } from "./hooks/useClaimState.ts"
import { useVerificationRun } from "./hooks/useVerificationRun.ts"
import { useVerificationState } from "./hooks/useVerificationState.ts"

const TICK_MS = 1_000

export const DomainDetailPage = () => {
  const { domain } = useParams({ from: "/domains/$domain" })
  const { account, isResolving: isResolvingSession } = useSessionState()

  const signedIn = account !== null
  const { claim, isResolving } = useClaimState({ domain, enabled: signedIn })
  const { verification } = useVerificationState({ verificationId: claim?.verificationId ?? null })
  const { attempts } = useAttemptsState({ verification })
  const { delegation } = useZoneState({ domain })

  const start = useClaimStart()
  const cancel = useClaimCancel({ claim })
  const run = useVerificationRun({ verification })
  const now = useNow(TICK_MS)

  if (!signedIn && !isResolvingSession) {
    return <Navigate to="/claim/$domain" params={{ domain }} replace />
  }

  const open = claim?.state === "pending" ? claim : null
  const record = open?.records[0] ?? null
  const tone = messageTone(claim, verification)
  const { headline, body } = verificationMessage(claim, verification)

  const action: DomainAction | null = open
    ? { label: "Check again", pending: run.isRunning, onClick: run.run }
    : {
        label: claim === null ? "Claim it" : "Claim it again",
        pending: start.isStarting,
        onClick: () => start.start(domain),
      }

  const entries: readonly ActivityEntry[] =
    claim === null
      ? []
      : [
          ...(claim.state === "proved" && claim.endedAt !== null
            ? [
                {
                  id: "proved",
                  title: "Ownership verified",
                  at: claim.endedAt,
                  tone: "success" as const,
                },
              ]
            : []),
          ...attempts.map(attemptEntry),
          { id: "added", title: "Domain added", at: claim.createdAt, tone: "idle" as const },
        ]

  return (
    <Page logIn={false}>
      <div className="mx-auto w-full max-w-[1180px] px-6 pt-[26px]">
        <DomainHeading domain={domain} action={action} />

        <DomainFacts
          status={statusPill(claim, verification)}
          provider={delegation?.provider ?? "other"}
          added={claim === null ? "—" : formatDate(claim.createdAt)}
          lastChecked={
            verification?.lastRunAt
              ? `${formatDuration(secondsSince(verification.lastRunAt, now))} ago`
              : "Never"
          }
        />

        <div className="flex flex-col pt-[28px] lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col lg:pr-12">
            {isResolving ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : (
              <OwnershipVerification
                steps={railSteps(claim, verification)}
                tone={tone}
                headline={headline}
                body={body}
                diagnosis={verification?.diagnosis ?? null}
                recordValue={tone === "error" && record ? record.value : null}
              />
            )}

            {record ? (
              <OwnershipInstructions
                domain={domain}
                provider={delegation?.provider ?? "other"}
                record={record}
              />
            ) : null}

            {open ? (
              <div className="flex pt-5">
                <Button
                  variant="link"
                  size="sm"
                  onClick={cancel.cancel}
                  disabled={cancel.isCanceling}
                >
                  {cancel.isCanceling ? "Ending this claim…" : "End this claim"}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="hidden w-px shrink-0 bg-border lg:block" />

          <div className="flex w-full shrink-0 flex-col pt-10 lg:w-[340px] lg:pt-0 lg:pl-12">
            <AutomaticChecks verification={verification} now={now} />
            <ActivityTimeline entries={entries} now={now} />
          </div>
        </div>
      </div>
    </Page>
  )
}
