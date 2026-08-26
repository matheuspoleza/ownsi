import type { ListedDomain } from "../../api/claim.api.ts"
import type { Verification } from "../../api/verification.api.ts"
import { normalizeDomain } from "../../lib/domain.utils.ts"
import type { DomainStatus } from "../../lib/status.constants.ts"
import { formatDuration, formatShortDate, secondsSince } from "../../lib/time.utils.ts"
import {
  EXPIRED_NEXT_STEP,
  NEXT_STEPS,
  PREVIEW_DOMAIN,
  UNCLAIMED_NEXT_STEP,
} from "./Domains.constants.ts"
import type { DomainRow } from "./hooks/useDashboardState.ts"

export const nextStep = (
  listed: ListedDomain,
  verification: Verification | null,
): string | null => {
  if (listed.status === "unclaimed") return UNCLAIMED_NEXT_STEP
  if (listed.status === "expired") return EXPIRED_NEXT_STEP
  if (listed.status !== "pending") return null

  return NEXT_STEPS[verification?.status ?? "checking"]
}

/** A live claim is measured in how long it has been waiting; a settled one carries its date. */
export const updatedLabel = (
  listed: ListedDomain,
  status: DomainStatus,
  now: number,
): string | null => {
  if (listed.claimStartedAt === null) return null
  if (status === "pending" || status === "checking") {
    return formatDuration(secondsSince(listed.claimStartedAt, now))
  }

  return formatShortDate(listed.claimEndedAt ?? listed.claimStartedAt)
}

/**
 * The row the typed name already has on this account, so the bar offers it instead of a claim.
 * Only the pages already loaded are searched; a name further down still answers on submit.
 */
export const rowFor = (rows: readonly DomainRow[], typed: string): DomainRow | null => {
  const name = normalizeDomain(typed)
  if (name === null) return null

  return rows.find((row) => row.listed.name === name || row.listed.unicodeName === name) ?? null
}

/** A claim in play is opened, never started again; anything else is still a name to claim. */
export const inPlay = (row: DomainRow): boolean =>
  row.status === "pending" || row.status === "checking" || row.status === "proved"

/** A claim still waiting on its record is the name the proof preview wears, before it holds one. */
export const awaitingName = (rows: readonly DomainRow[]): string =>
  rows.find((row) => row.status === "pending" || row.status === "checking")?.listed.unicodeName ??
  PREVIEW_DOMAIN
