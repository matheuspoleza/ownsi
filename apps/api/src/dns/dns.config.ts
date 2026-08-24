import type { DohResolverId } from "./infra/doh-resolver.ts"

export type DnsDriver = "doh" | "fake"

export type DnsConfig = {
  readonly driver: DnsDriver
  readonly recursiveResolvers: readonly DohResolverId[]
  readonly resolverTimeoutMs: number
  readonly zoneCacheTtlSeconds: number
  readonly soaBudgetMs: number
}
