import type { Diagnosis } from "../../verification/verification.contract.ts"
import { daysAfter } from "./claim.ts"

export const NOTICE_KINDS = ["proved", "nudge", "expiring", "coexistence"] as const

export type NoticeKind = (typeof NOTICE_KINDS)[number]

export type ClaimNotice =
  | { readonly kind: "proved"; readonly provedAt: Date }
  | { readonly kind: "nudge"; readonly diagnosis: Diagnosis }
  | { readonly kind: "expiring"; readonly diagnosis: Diagnosis }
  | { readonly kind: "coexistence" }

const NUDGE_AFTER_DAYS = [1, 3] as const
const WARNING_AFTER_DAYS = 6

const INTERVALS = [
  { untilAgeSeconds: 300, everySeconds: 30 },
  { untilAgeSeconds: 3_600, everySeconds: 300 },
  { untilAgeSeconds: 21_600, everySeconds: 1_800 },
  { untilAgeSeconds: 86_400, everySeconds: 7_200 },
] as const

const SETTLED_EVERY_SECONDS = 21_600
const MOST_DOUBLINGS = 3

export function intervalSeconds(ageSeconds: number, consecutiveFailures: number): number {
  const step = INTERVALS.find((interval) => ageSeconds < interval.untilAgeSeconds)

  return (
    (step?.everySeconds ?? SETTLED_EVERY_SECONDS) *
    2 ** Math.min(consecutiveFailures, MOST_DOUBLINGS)
  )
}

export function noticesBetween(
  openedAt: Date,
  from: Date,
  to: Date,
  diagnosis: Diagnosis,
): readonly ClaimNotice[] {
  const notices: ClaimNotice[] = []

  if (NUDGE_AFTER_DAYS.some((days) => crossed(openedAt, days, from, to))) {
    notices.push({ kind: "nudge", diagnosis })
  }
  if (crossed(openedAt, WARNING_AFTER_DAYS, from, to)) {
    notices.push({ kind: "expiring", diagnosis })
  }

  return notices
}

function crossed(openedAt: Date, days: number, from: Date, to: Date): boolean {
  const day = daysAfter(openedAt, days)

  return from < day && day <= to
}
