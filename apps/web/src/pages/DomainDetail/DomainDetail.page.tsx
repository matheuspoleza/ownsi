import { ArchiveIcon, Skeleton, TrashIcon } from "@ownsi/ui"
import { Navigate, useNavigate, useParams } from "@tanstack/react-router"
import { Page } from "../../components/Page.component.tsx"
import { ProofTicket } from "../../components/ProofTicket.component.tsx"
import { useClaimStart } from "../../hooks/useClaimStart.ts"
import { useClaimState } from "../../hooks/useClaimState.ts"
import { useNow } from "../../hooks/useNow.ts"
import { useProofLink } from "../../hooks/useProofLink.ts"
import { useSessionState } from "../../hooks/useSessionState.ts"
import { useZoneState } from "../../hooks/useZoneState.ts"
import { proofPublication } from "../../lib/proof.utils.ts"
import { claimStanding, domainStatus } from "../../lib/status.utils.ts"
import { formatAge, formatDate, secondsSince } from "../../lib/time.utils.ts"
import { ActivityTimeline } from "./components/ActivityTimeline.component.tsx"
import { type ActivityEntry, attemptEntry } from "./components/ActivityTimeline.utils.ts"
import { AutomaticChecks } from "./components/AutomaticChecks.component.tsx"
import { CoexistenceCard } from "./components/CoexistenceCard.component.tsx"
import { DnsCard } from "./components/DnsCard.component.tsx"
import { DomainFacts } from "./components/DomainFacts.component.tsx"
import {
  type DomainAction,
  DomainHeading,
  type DomainMenuItem,
} from "./components/DomainHeading.component.tsx"
import { OwnershipInstructions } from "./components/OwnershipInstructions.component.tsx"
import { OwnershipVerification } from "./components/OwnershipVerification.component.tsx"
import { ProofActions } from "./components/ProofActions.component.tsx"
import { holdersOf, messageTone, railSteps, verificationMessage } from "./DomainDetail.utils.ts"
import { useAttemptsState } from "./hooks/useAttemptsState.ts"
import { useClaimCancel } from "./hooks/useClaimCancel.ts"
import { useDomainArchive } from "./hooks/useDomainArchive.ts"
import { useVerificationRun } from "./hooks/useVerificationRun.ts"
import { useVerificationState } from "./hooks/useVerificationState.ts"

const TICK_MS = 1_000

export const DomainDetailPage = () => {
  const { domain } = useParams({ from: "/domains/$domain" })
  const navigate = useNavigate()
  const { account, isResolving: isResolvingSession } = useSessionState()

  const signedIn = account !== null
  const { claim, isResolving } = useClaimState({ domain, enabled: signedIn })
  const { verification } = useVerificationState({ verificationId: claim?.verificationId ?? null })
  const { attempts } = useAttemptsState({ verification })
  const { delegation } = useZoneState({ domain })

  const start = useClaimStart()
  const cancel = useClaimCancel({ claim })
  const archive = useDomainArchive({
    domainId: claim?.domainId ?? null,
    onArchived: () => navigate({ to: "/domains" }),
  })
  const run = useVerificationRun({ verification })
  const share = useProofLink({ claimId: claim?.state === "proved" ? claim.id : null })
  const now = useNow(TICK_MS)

  if (!signedIn && !isResolvingSession) {
    return <Navigate to="/claim/$domain" params={{ domain }} replace />
  }

  const open = claim?.state === "pending" ? claim : null
  const proved = claim?.state === "proved" ? claim : null
  const record = open?.records[0] ?? null

  const menu: readonly DomainMenuItem[] = [
    ...(open ? [{ label: "End this claim", icon: <TrashIcon />, onSelect: cancel.cancel }] : []),
    {
      label: "Archive domain",
      icon: <ArchiveIcon />,
      onSelect: archive.archive,
      separated: open !== null,
    },
  ]

  if (proved) {
    const holders = holdersOf(proved, account?.email ?? null)
    const publication = share.link === null ? null : proofPublication(share.link.url)

    return (
      <Page logIn={false}>
        <div className="mx-auto w-full max-w-[1180px] px-6">
          <DomainHeading domain={proved.unicodeDomain} action={null} menu={menu} proved />

          <div className="flex flex-col gap-7 pt-7 lg:flex-row">
            <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[400px]">
              <ProofTicket
                domain={proved.unicodeDomain}
                provedAt={proved.endedAt}
                provider={delegation?.provider}
                token={proved.token}
                publication={publication}
              />
              <ProofActions
                publication={publication}
                onPublish={share.publish}
                onRevoke={share.revoke}
                isPublishing={share.isPublishing}
              />

              {share.failure ? (
                <p role="alert" className="text-[12px] text-error">
                  {share.failure.message}
                </p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {delegation ? (
                <DnsCard
                  provider={delegation.provider}
                  nameservers={delegation.nameservers}
                  observedAt={delegation.observedAt}
                />
              ) : (
                <Skeleton className="h-[190px] w-full rounded-xl" />
              )}

              {holders.length > 0 ? <CoexistenceCard holders={holders} /> : null}
            </div>
          </div>
        </div>
      </Page>
    )
  }

  const tone = messageTone(claim, verification)
  const { headline, body } = verificationMessage(claim, verification)

  const action: DomainAction = open
    ? { label: "check again", pending: run.isRunning, onClick: run.run }
    : {
        label: claim === null ? "claim it" : "claim it again",
        pending: start.isStarting,
        onClick: () => start.start(domain),
      }

  const entries: readonly ActivityEntry[] =
    claim === null
      ? []
      : [
          ...attempts.map(attemptEntry),
          { id: "added", title: "Domain added", at: claim.createdAt, tone: "idle" as const },
        ]

  return (
    <Page logIn={false}>
      <div className="mx-auto w-full max-w-[1180px] px-6">
        <DomainHeading domain={domain} action={action} menu={menu} />

        {start.failure ? (
          <p role="alert" className="pt-3 text-[12px] text-error">
            {start.failure.message}
          </p>
        ) : null}

        <DomainFacts
          status={domainStatus(claimStanding(claim), verification)}
          provider={delegation?.provider ?? "other"}
          added={claim === null ? "—" : formatDate(claim.createdAt)}
          lastChecked={
            verification?.lastRunAt ? formatAge(secondsSince(verification.lastRunAt, now)) : "Never"
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
