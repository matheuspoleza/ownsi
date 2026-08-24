import type { DnsConfig } from "./dns/dns.config.ts"

export type AppConfig = {
  readonly port: number
  readonly appUrl: string
  readonly databaseUrl: string
  readonly dns: DnsConfig
}

type Environment = Record<string, string | undefined>

export function loadConfig(source: Environment = process.env): AppConfig {
  return {
    port: integer(source.PORT, 3000),
    appUrl: source.APP_URL ?? "http://localhost:5173",
    databaseUrl: required(source, "DATABASE_URL"),
    dns: {
      driver: source.DNS_DRIVER === "fake" ? "fake" : "doh",
      recursiveResolvers: ["cloudflare", "google", "quad9"],
      resolverTimeoutMs: integer(source.DNS_RESOLVER_TIMEOUT_MS, 4_000),
      zoneCacheTtlSeconds: integer(source.ZONE_CACHE_TTL_SECONDS, 300),
      soaBudgetMs: integer(source.SOA_BUDGET_MS, 2_500),
    },
  }
}

function required(source: Environment, key: string): string {
  const value = source[key]
  if (!value) throw new Error(`Missing environment variable: ${key}`)
  return value
}

function integer(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
