const INTERVALS = [
  { untilAgeSeconds: 300, everySeconds: 30 },
  { untilAgeSeconds: 3_600, everySeconds: 300 },
  { untilAgeSeconds: 21_600, everySeconds: 1_800 },
  { untilAgeSeconds: 86_400, everySeconds: 7_200 },
] as const

const SETTLED_EVERY_SECONDS = 21_600
const MOST_DOUBLINGS = 3

export const FIRST_RUN_SECONDS = 30

export function intervalSeconds(ageSeconds: number, consecutiveFailures: number): number {
  const step = INTERVALS.find((interval) => ageSeconds < interval.untilAgeSeconds)

  return (
    (step?.everySeconds ?? SETTLED_EVERY_SECONDS) *
    2 ** Math.min(consecutiveFailures, MOST_DOUBLINGS)
  )
}
