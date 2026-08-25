import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import { createDescribeZone } from "./application/describe-zone.ts"
import { createReadZone, type ReadZone } from "./application/read-zone.ts"
import { createFindDelegation, withFailover } from "./domain/delegation.ts"
import type { AskNameserver, DnsResolver, ZoneRepository } from "./domain/ports.ts"
import { createReadSoa } from "./domain/soa-lookup.ts"
import { dohResolver } from "./infra/doh-resolver.ts"
import { fakeNameserver, fakeResolver } from "./infra/fake-resolver.ts"
import { DEMO_FIXTURES } from "./infra/fixtures.ts"
import { nodeNameserver } from "./infra/nameserver.ts"
import { postgresZoneRepository } from "./infra/zone-repository.ts"
import type { ZonesConfig } from "./zones.config.ts"
import type { DescribeZone } from "./zones.contract.ts"

export type ZonesModuleDeps = {
  readonly config: ZonesConfig
  readonly database: Database
  readonly clock: Clock
}

export type ZonesModuleOverrides = {
  readonly resolvers?: readonly DnsResolver[]
  readonly askNameserver?: AskNameserver
  readonly zones?: ZoneRepository
}

export type ZonesModule = {
  readonly readZone: ReadZone
  readonly describeZone: DescribeZone
}

export function createZonesModule(
  deps: ZonesModuleDeps,
  overrides: ZonesModuleOverrides = {},
): ZonesModule {
  const { config } = deps
  const faked = config.driver === "fake"

  const resolvers =
    overrides.resolvers ??
    (faked
      ? [fakeResolver(DEMO_FIXTURES)]
      : config.recursiveResolvers.map((id) => dohResolver(id, config.resolverTimeoutMs)))

  const askNameserver =
    overrides.askNameserver ??
    (faked ? fakeNameserver(DEMO_FIXTURES) : nodeNameserver(config.soaBudgetMs))

  const zones = overrides.zones ?? postgresZoneRepository(deps.database)

  const resolve = withFailover(resolvers)

  const readZone = createReadZone({
    findDelegation: createFindDelegation(resolve),
    readSoa: createReadSoa({ askNameserver, resolve, budgetMs: config.soaBudgetMs }),
    zones,
    clock: deps.clock,
    cacheTtlSeconds: config.zoneCacheTtlSeconds,
  })

  return { readZone, describeZone: createDescribeZone(readZone) }
}
