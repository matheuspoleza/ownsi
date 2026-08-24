import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import type { FindDelegation } from "../domain/delegation.ts"
import { type DomainName, type DomainNameError, parseDomainName } from "../domain/domain-name.ts"
import type { ZoneRepository } from "../domain/ports.ts"
import type { PublishingEstimate } from "../domain/publishing.ts"
import type { ReadSoa } from "../domain/soa-lookup.ts"
import { isFresh, publishingEstimate, type Zone, zoneFromAnswers } from "../domain/zone.ts"

export type ReadZoneError =
  | { readonly type: "invalid_domain"; readonly reason: DomainNameError }
  | { readonly type: "no_delegation"; readonly name: string }
  | { readonly type: "unresolvable" }

export type ZoneReading = {
  readonly domain: DomainName
  readonly zone: Zone
  readonly publishing: PublishingEstimate
  readonly fromCache: boolean
}

export type ReadZoneInput = {
  readonly name: string
  readonly signal?: AbortSignal
}

export type ReadZone = (input: ReadZoneInput) => Promise<Result<ZoneReading, ReadZoneError>>

export type ReadZoneDeps = {
  readonly findDelegation: FindDelegation
  readonly readSoa: ReadSoa
  readonly zones: ZoneRepository
  readonly clock: Clock
  readonly cacheTtlSeconds: number
}

export function createReadZone(deps: ReadZoneDeps): ReadZone {
  return async ({ name, signal }) => {
    const parsed = parseDomainName(name)
    if (!parsed.ok) return err({ type: "invalid_domain", reason: parsed.error })

    const domain = parsed.value
    const observedAt = deps.clock()

    const cached = await deps.zones.findByRequestedName(domain.ascii)
    if (cached && isFresh(cached, observedAt, deps.cacheTtlSeconds)) {
      return ok(reading(domain, cached, true))
    }

    const delegation = await deps.findDelegation(domain, signal)
    if (delegation.type === "unreachable") return err({ type: "unresolvable" })
    if (delegation.type === "not_delegated") {
      return err({ type: "no_delegation", name: domain.ascii })
    }

    const soa = await deps.readSoa(delegation.zoneName, delegation.nameservers, signal)

    const zone = zoneFromAnswers({
      name: delegation.zoneName,
      delegation: delegation.answer,
      soa,
      observedAt,
    })

    await deps.zones.save(domain.ascii, zone)
    return ok(reading(domain, zone, false))
  }
}

function reading(domain: DomainName, zone: Zone, fromCache: boolean): ZoneReading {
  return { domain, zone, publishing: publishingEstimate(zone), fromCache }
}
