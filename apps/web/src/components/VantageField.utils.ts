import {
  AGREED_BEAT,
  ASK_MS,
  BEATS,
  LOCK_MS,
  type MapStory,
  RESOLVERS,
} from "./VantageField.constants.ts"

export const isAgreedBeat = (tick: number) => tick % BEATS === AGREED_BEAT

export const isLockBeat = (tick: number, story: MapStory) =>
  isAgreedBeat(tick) && story === "proven"

export const beatDuration = (tick: number, story: MapStory) =>
  isLockBeat(tick, story) ? LOCK_MS : ASK_MS

export const markAtBeat = (beat: number) => {
  const [first, second, third] = RESOLVERS
  return beat === 0 ? first : beat === 1 ? second : third
}
