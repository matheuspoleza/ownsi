const MILLISECONDS_IN_DAY = 86_400_000
const MILLISECONDS_IN_SECOND = 1_000

export function daysAfter(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * MILLISECONDS_IN_DAY)
}

export function secondsAfter(instant: Date, seconds: number): Date {
  return new Date(instant.getTime() + seconds * MILLISECONDS_IN_SECOND)
}

export function secondsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MILLISECONDS_IN_SECOND
}
