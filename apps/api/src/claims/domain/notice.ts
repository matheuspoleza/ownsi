import { daysAfter } from "../../shared/time.ts"
import type { Diagnosis } from "../../verification/verification.contract.ts"

export const NOTICE_KINDS = ["proved", "nudge", "expiring", "coexistence"] as const

export type NoticeKind = (typeof NOTICE_KINDS)[number]

export type ClaimNotice =
  | { readonly kind: "proved"; readonly provedAt: Date }
  | { readonly kind: "nudge"; readonly diagnosis: Diagnosis }
  | { readonly kind: "expiring"; readonly diagnosis: Diagnosis }
  | { readonly kind: "coexistence" }

const NUDGE_AFTER_DAYS = [1, 3] as const
const WARNING_AFTER_DAYS = 6

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
