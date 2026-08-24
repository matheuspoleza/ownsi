import type { SoaRecord } from "./dns.ts"

export type PublishingEstimate =
  | { readonly type: "known"; readonly minutes: number }
  | { readonly type: "unknown" }

const UNKNOWN: PublishingEstimate = { type: "unknown" }
const SECONDS_PER_MINUTE = 60

export function estimatePublishing(negativeCacheTtlSeconds: number | null): PublishingEstimate {
  if (negativeCacheTtlSeconds === null) return UNKNOWN

  const seconds = Math.max(negativeCacheTtlSeconds, 0)
  if (seconds === 0) return { type: "known", minutes: 0 }

  return { type: "known", minutes: Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE)) }
}

export function estimateFromSoa(soa: SoaRecord | null): PublishingEstimate {
  return estimatePublishing(soa?.negativeCacheTtlSeconds ?? null)
}
