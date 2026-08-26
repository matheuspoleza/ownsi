const SECOND_MS = 1000
const MINUTE_SECONDS = 60
const HOUR_SECONDS = 3600
const DAY_SECONDS = 86400

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })

/** The same date without its year, for a column that is read at a glance. */
export const formatShortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short" })

export const formatDuration = (seconds: number): string => {
  if (seconds < MINUTE_SECONDS) return `${Math.max(1, Math.round(seconds))} sec`
  if (seconds < HOUR_SECONDS) return `${Math.round(seconds / MINUTE_SECONDS)} min`
  if (seconds < DAY_SECONDS) return `${Math.round(seconds / HOUR_SECONDS)} hr`

  const days = Math.round(seconds / DAY_SECONDS)
  return days === 1 ? "1 day" : `${days} days`
}

/** How long ago, floored: "1 min ago" holds until the second minute is complete. */
export const formatAge = (seconds: number): string => {
  if (seconds < MINUTE_SECONDS) return "just now"
  if (seconds < HOUR_SECONDS) return `${Math.floor(seconds / MINUTE_SECONDS)} min ago`
  if (seconds < DAY_SECONDS) return `${Math.floor(seconds / HOUR_SECONDS)} hr ago`

  const days = Math.floor(seconds / DAY_SECONDS)
  return days === 1 ? "1 day ago" : `${days} days ago`
}

export const secondsUntil = (iso: string, now: number): number =>
  Math.max(0, Math.round((new Date(iso).getTime() - now) / SECOND_MS))

export const secondsSince = (iso: string, now: number): number =>
  secondsBetween(new Date(iso).getTime(), now)

const secondsBetween = (from: number, now: number): number =>
  Math.max(0, Math.round((now - from) / SECOND_MS))
