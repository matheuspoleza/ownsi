import type { ZoneRepository } from "../../src/zones/domain/ports.ts"
import type { Zone } from "../../src/zones/domain/zone.ts"

export function inMemoryZoneRepository(seed: ReadonlyArray<[string, Zone]> = []): ZoneRepository {
  const zones = new Map<string, Zone>(seed)

  return {
    async findByRequestedName(requestedName) {
      return zones.get(requestedName) ?? null
    },
    async save(requestedName, zone) {
      zones.set(requestedName, zone)
    },
  }
}
