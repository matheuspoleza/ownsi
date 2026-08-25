import { type Claim, end, isOpen, type OpenClaim, provedAt } from "./claim.ts"
import type { Domain } from "./domain.ts"

export type AccountDomain = {
  readonly userId: string
  readonly domain: Domain
  readonly claim: Claim
  readonly history: readonly Claim[]
  readonly archivedAt: Date | null
}

export function pendingClaim(record: AccountDomain): OpenClaim | null {
  return isOpen(record.claim) ? record.claim : null
}

export function reclaim(record: AccountDomain, claim: OpenClaim): AccountDomain {
  return {
    ...record,
    claim,
    history: [record.claim, ...record.history],
    archivedAt: null,
  }
}

export function withClaim(record: AccountDomain, claim: Claim): AccountDomain {
  return { ...record, claim }
}

export function archive(record: AccountDomain, at: Date): AccountDomain {
  const open = pendingClaim(record)
  return {
    ...record,
    claim: open ? end(open, "canceled", at) : record.claim,
    archivedAt: at,
  }
}

export function claimsOf(record: AccountDomain): readonly Claim[] {
  return [record.claim, ...record.history]
}

export function firstVerifiedAt(record: AccountDomain): Date | null {
  return earliest(provenDates(record))
}

export function lastConfirmedAt(record: AccountDomain): Date | null {
  return latest(provenDates(record))
}

function provenDates(record: AccountDomain): readonly Date[] {
  return claimsOf(record)
    .map(provedAt)
    .filter((date): date is Date => date !== null)
}

function earliest(dates: readonly Date[]): Date | null {
  return dates.reduce<Date | null>(
    (found, date) => (found === null || date < found ? date : found),
    null,
  )
}

function latest(dates: readonly Date[]): Date | null {
  return dates.reduce<Date | null>(
    (found, date) => (found === null || date > found ? date : found),
    null,
  )
}
