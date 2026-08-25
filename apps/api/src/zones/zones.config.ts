import type { DohResolverId } from "./infra/doh-resolver.service.ts"

export type ZonesDriver = "doh" | "fake"

export type ZonesConfig = {
  readonly driver: ZonesDriver
  readonly recursiveResolvers: readonly DohResolverId[]
  readonly resolverTimeoutMs: number
  readonly zoneCacheTtlSeconds: number
  readonly soaBudgetMs: number
}
