const SECOND_MS = 1000
const MINUTE_SECONDS = 60
const HOUR_SECONDS = 3600
const DAY_SECONDS = 86400

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })

export const formatDuration = (seconds: number): string => {
  if (seconds < MINUTE_SECONDS) return `${Math.max(1, Math.round(seconds))} sec`
  if (seconds < HOUR_SECONDS) return `${Math.round(seconds / MINUTE_SECONDS)} min`
  if (seconds < DAY_SECONDS) return `${Math.round(seconds / HOUR_SECONDS)} hr`

  const days = Math.round(seconds / DAY_SECONDS)
  return days === 1 ? "1 day" : `${days} days`
}

export const secondsUntil = (iso: string, now: number): number =>
  Math.max(0, Math.round((new Date(iso).getTime() - now) / SECOND_MS))

export const secondsSince = (iso: string, now: number): number =>
  Math.max(0, Math.round((now - new Date(iso).getTime()) / SECOND_MS))
