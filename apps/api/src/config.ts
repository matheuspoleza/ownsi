import type { AuthConfig, GoogleCredentials } from "./auth/auth.config.ts"
import type { MailerConfig } from "./shared/email.ts"
import type { InngestConfig } from "./shared/inngest.ts"
import type { VerificationConfig } from "./verification/verification.config.ts"
import type { ZonesConfig } from "./zones/zones.config.ts"

export type AppConfig = {
  readonly port: number
  readonly appUrl: string
  readonly databaseUrl: string
  readonly auth: AuthConfig
  readonly mailer: MailerConfig
  readonly inngest: InngestConfig
  readonly zones: ZonesConfig
  readonly verification: VerificationConfig
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
    inngest: inngestConfig(source),
    zones: {
      driver: source.DNS_DRIVER === "fake" ? "fake" : "doh",
      recursiveResolvers: ["cloudflare", "google", "quad9"],
      resolverTimeoutMs: integer(source.DNS_RESOLVER_TIMEOUT_MS, 4_000),
      zoneCacheTtlSeconds: integer(source.ZONE_CACHE_TTL_SECONDS, 300),
      soaBudgetMs: integer(source.SOA_BUDGET_MS, 2_500),
    },
    verification: {
      driver: source.DNS_DRIVER === "fake" ? "fake" : "doh",
      recursiveResolvers: ["cloudflare", "google", "quad9"],
      resolverTimeoutMs: integer(source.DNS_RESOLVER_TIMEOUT_MS, 4_000),
      authoritativeBudgetMs: integer(source.AUTHORITATIVE_BUDGET_MS, 2_500),
    },
  }
}

function inngestConfig(source: Environment): InngestConfig {
  const isDev = source.INNGEST_DEV === "1"

  return {
    driver: source.INNGEST_DRIVER === "manual" ? "manual" : "inngest",
    id: "ownsi",
    isDev,
    baseUrl: isDev ? (source.INNGEST_BASE_URL ?? null) : null,
    eventKey: source.INNGEST_EVENT_KEY ?? "",
    signingKey: source.INNGEST_SIGNING_KEY ?? "",
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
