import type { DomainsConfig } from "./domains/domains.config.ts"
import type { AuthConfig, GoogleCredentials } from "./shared/auth.ts"
import type { MailerConfig } from "./shared/mailer.ts"
import type { ZonesConfig } from "./zones/zones.config.ts"

export type AppConfig = {
  readonly port: number
  readonly appUrl: string
  readonly databaseUrl: string
  readonly auth: AuthConfig
  readonly mailer: MailerConfig
  readonly zones: ZonesConfig
  readonly domains: DomainsConfig
}

type Environment = Record<string, string | undefined>

const AUTH_BASE_PATH = "/api/auth"
const DEFAULT_APP_URL = "http://localhost:5173"
const DEFAULT_SENDER = "ownsi <no-reply@ownsi.dev>"
const DEFAULT_MAGIC_LINK_TTL_SECONDS = 600

export function loadConfig(source: Environment = process.env): AppConfig {
  const appUrl = source.APP_URL ?? DEFAULT_APP_URL

  return {
    port: integer(source.PORT, 3000),
    appUrl,
    databaseUrl: required(source, "DATABASE_URL"),
    auth: {
      secret: required(source, "BETTER_AUTH_SECRET"),
      baseUrl: source.BETTER_AUTH_URL ?? appUrl,
      basePath: AUTH_BASE_PATH,
      magicLinkTtlSeconds: integer(source.MAGIC_LINK_TTL_SECONDS, DEFAULT_MAGIC_LINK_TTL_SECONDS),
      google: googleCredentials(source),
    },
    mailer: mailerConfig(source),
    zones: {
      driver: source.DNS_DRIVER === "fake" ? "fake" : "doh",
      recursiveResolvers: ["cloudflare", "google", "quad9"],
      resolverTimeoutMs: integer(source.DNS_RESOLVER_TIMEOUT_MS, 4_000),
      zoneCacheTtlSeconds: integer(source.ZONE_CACHE_TTL_SECONDS, 300),
      soaBudgetMs: integer(source.SOA_BUDGET_MS, 2_500),
    },
    domains: { driver: "demo" },
  }
}

function mailerConfig(source: Environment): MailerConfig {
  const driver = source.MAILER_DRIVER === "log" ? "log" : "resend"

  return {
    driver,
    apiKey: driver === "resend" ? required(source, "RESEND_API_KEY") : "",
    from: source.EMAIL_FROM ?? DEFAULT_SENDER,
  }
}

function googleCredentials(source: Environment): GoogleCredentials | null {
  const clientId = source.GOOGLE_CLIENT_ID
  const clientSecret = source.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  return { clientId, clientSecret }
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
