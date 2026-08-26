import type { OwnsiError } from "../../api/zone.api.ts"

export interface HeroSubtitleInput {
  failure: OwnsiError | null
  isReading: boolean
  isOpening: boolean
  publishingMinutes: number | null | undefined
}

export const heroSubtitle = ({
  failure,
  isReading,
  isOpening,
  publishingMinutes,
}: HeroSubtitleInput): string => {
  if (failure) return failure.message
  if (isOpening) return "Minting the token bound to your account."
  if (publishingMinutes != null)
    return `Records on this zone usually show up in about ${publishingMinutes} minutes.`
  if (isReading) return "Reading the zone before we hand you the record."
  return "We read the zone. Log in and we will hand you the record."
}
