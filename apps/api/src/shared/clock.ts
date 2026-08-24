export type Clock = () => Date

export const systemClock: Clock = () => new Date()

export const fixedClock =
  (instant: Date): Clock =>
  () =>
    instant
