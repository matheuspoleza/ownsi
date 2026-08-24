import type { Database } from "../../shared/database.ts"
import type { ZoneRepository } from "../domain/ports.ts"
import type { ProviderId } from "../domain/provider.ts"
import type { Zone } from "../domain/zone.ts"

export function postgresZoneRepository(database: Database): ZoneRepository {
  return {
    async findByRequestedName(requestedName) {
      const row = await database.zone.findUnique({ where: { requestedName } })
      if (!row) return null

      return {
        name: row.name,
        nameservers: row.nameservers,
        provider: row.provider as ProviderId,
        soa:
          row.negativeCacheTtlSeconds === null
            ? null
            : {
                serial: Number(row.serial ?? 0),
                negativeCacheTtlSeconds: row.negativeCacheTtlSeconds,
              },
        observedAt: row.observedAt,
      }
    },

    async save(requestedName, zone) {
      const data = {
        name: zone.name,
        nameservers: [...zone.nameservers],
        provider: zone.provider,
        negativeCacheTtlSeconds: zone.soa?.negativeCacheTtlSeconds ?? null,
        serial: zone.soa ? BigInt(zone.soa.serial) : null,
        observedAt: zone.observedAt,
      }

      await database.zone.upsert({
        where: { requestedName },
        create: { requestedName, ...data },
        update: data,
      })
    },
  }
}

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
