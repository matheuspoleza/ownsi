import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import { createReadZone, type ReadZone } from "./application/read-zone.ts"
import type { DnsConfig } from "./dns.config.ts"
import { createFindDelegation, withFailover } from "./domain/delegation.ts"
import type { AskNameserver, DnsResolver, ZoneRepository } from "./domain/ports.ts"
import { createReadSoa } from "./domain/soa-lookup.ts"
import { dohResolver } from "./infra/doh-resolver.ts"
import { fakeNameserver, fakeResolver } from "./infra/fake-resolver.ts"
import { DEMO_FIXTURES } from "./infra/fixtures.ts"
import { nodeNameserver } from "./infra/nameserver.ts"
import { inMemoryZoneRepository, postgresZoneRepository } from "./infra/zone-repository.ts"

export type DnsModuleDeps = {
  readonly config: DnsConfig
  readonly database: Database
  readonly clock: Clock
}

export type DnsModuleOverrides = {
  readonly resolvers?: readonly DnsResolver[]
  readonly askNameserver?: AskNameserver
  readonly zones?: ZoneRepository
}

export type DnsModule = {
  readonly readZone: ReadZone
}

export function createDnsModule(
  deps: DnsModuleDeps,
  overrides: DnsModuleOverrides = {},
): DnsModule {
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

  const zones =
    overrides.zones ?? (faked ? inMemoryZoneRepository() : postgresZoneRepository(deps.database))

  const resolve = withFailover(resolvers)

  const readZone = createReadZone({
    findDelegation: createFindDelegation(resolve),
    readSoa: createReadSoa({ askNameserver, resolve, budgetMs: config.soaBudgetMs }),
    zones,
    clock: deps.clock,
    cacheTtlSeconds: config.zoneCacheTtlSeconds,
  })

  return { readZone }
}
