import type { Clock } from "../../shared/clock.ts"
import { type DomainName, type DomainNameError, parseDomainName } from "../../shared/domain-name.ts"
import type { FindDelegation } from "../domain/delegation.ts"
import type { ZoneRepository } from "../domain/ports.ts"
import type { PublishingEstimate } from "../domain/publishing.ts"
import type { ReadSoa } from "../domain/soa-lookup.ts"
import {
  isFresh,
  publishingEstimate,
  withSoa,
  type Zone,
  zoneFromDelegation,
} from "../domain/zone.ts"

export type ReadZoneError =
  | { readonly type: "invalid_domain"; readonly reason: DomainNameError }
  | { readonly type: "no_delegation"; readonly name: string }
  | { readonly type: "unresolvable" }

export type ZoneStep =
  | { readonly type: "failed"; readonly error: ReadZoneError }
  | {
      readonly type: "delegated"
      readonly domain: DomainName
      readonly zone: Zone
      readonly fromCache: boolean
    }
  | {
      readonly type: "published"
      readonly publishing: PublishingEstimate
      readonly negativeCacheTtlSeconds: number | null
    }

export type ReadZoneInput = {
  readonly name: string
  readonly signal?: AbortSignal
}

export type ReadZone = (input: ReadZoneInput) => AsyncGenerator<ZoneStep, void>

export type ReadZoneDeps = {
  readonly findDelegation: FindDelegation
  readonly readSoa: ReadSoa
  readonly zones: ZoneRepository
  readonly clock: Clock
  readonly cacheTtlSeconds: number
}

export function createReadZone(deps: ReadZoneDeps): ReadZone {
  return async function* ({ name, signal }) {
    const parsed = parseDomainName(name)
    if (!parsed.ok) return yield failed({ type: "invalid_domain", reason: parsed.error })

    const domain = parsed.value
    const observedAt = deps.clock()

    const cached = await deps.zones.findByRequestedName(domain.ascii)
    if (cached && isFresh(cached, observedAt, deps.cacheTtlSeconds)) {
      yield delegated(domain, cached, true)
      return yield published(cached)
    }

    const delegation = await deps.findDelegation(domain, signal)
    if (delegation.type === "unreachable") return yield failed({ type: "unresolvable" })
    if (delegation.type === "not_delegated") {
      return yield failed({ type: "no_delegation", name: domain.ascii })
    }

    const withoutSoa = zoneFromDelegation({
      name: delegation.zoneName,
      delegation: delegation.answer,
      observedAt,
    })
    yield delegated(domain, withoutSoa, false)

    const soa = await deps.readSoa(delegation.zoneName, delegation.nameservers, signal)
    const zone = withSoa(withoutSoa, soa)

    await deps.zones.save(domain.ascii, zone)
    yield published(zone)
  }
}

function failed(error: ReadZoneError): ZoneStep {
  return { type: "failed", error }
}

function delegated(domain: DomainName, zone: Zone, fromCache: boolean): ZoneStep {
  return { type: "delegated", domain, zone, fromCache }
}

function published(zone: Zone): ZoneStep {
  return {
    type: "published",
    publishing: publishingEstimate(zone),
    negativeCacheTtlSeconds: zone.soa?.negativeCacheTtlSeconds ?? null,
  }
}
