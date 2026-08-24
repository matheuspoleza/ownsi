import { type AnsweredDns, normalizeHostnameList, recordsOfType, soaOf } from "./dns.ts"
import { detectProvider, type ProviderId } from "./provider.ts"
import { estimatePublishing, type PublishingEstimate } from "./publishing.ts"

export type ZoneSoa = {
  readonly serial: number
  readonly negativeCacheTtlSeconds: number
}

export type Zone = {
  readonly name: string
  readonly nameservers: readonly string[]
  readonly provider: ProviderId
  readonly soa: ZoneSoa | null
  readonly observedAt: Date
}

const MILLISECONDS_PER_SECOND = 1_000

export function zoneFromAnswers(params: {
  readonly name: string
  readonly delegation: AnsweredDns
  readonly soa: AnsweredDns | null
  readonly observedAt: Date
}): Zone {
  const nameservers = normalizeHostnameList(
    recordsOfType(params.delegation, "NS").map((record) => record.data),
  )
  const soa = params.soa ? soaOf(params.soa) : null

  return {
    name: params.name,
    nameservers,
    provider: detectProvider(nameservers),
    soa: soa ? { serial: soa.serial, negativeCacheTtlSeconds: soa.negativeCacheTtlSeconds } : null,
    observedAt: params.observedAt,
  }
}

export function isFresh(zone: Zone, now: Date, ttlSeconds: number): boolean {
  return now.getTime() - zone.observedAt.getTime() < ttlSeconds * MILLISECONDS_PER_SECOND
}

export function publishingEstimate(zone: Zone): PublishingEstimate {
  return estimatePublishing(zone.soa?.negativeCacheTtlSeconds ?? null)
}
