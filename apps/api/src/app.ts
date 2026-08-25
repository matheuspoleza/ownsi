import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"
import { claimsApp } from "./claims/claims.app.ts"
import { type ClaimsModuleOverrides, createClaimsModule } from "./claims/claims.module.ts"
import type { AppConfig } from "./config.ts"
import { dnsApp } from "./dns/dns.app.ts"
import { createDnsModule, type DnsModuleOverrides } from "./dns/dns.module.ts"
import { createAuth, createCheckSession } from "./shared/auth.ts"
import type { Clock } from "./shared/clock.ts"
import { systemClock } from "./shared/clock.ts"
import { createDatabase, type Database } from "./shared/database.ts"
import { healthRoutes } from "./shared/http/health.routes.ts"
import { sessionPlugin } from "./shared/http/session.ts"
import { createSendMagicLink, type SendMagicLink } from "./shared/mailer.ts"

export type AppOverrides = {
  readonly database?: Database
  readonly clock?: Clock
  readonly sendMagicLink?: SendMagicLink
  readonly dns?: DnsModuleOverrides
  readonly claims?: ClaimsModuleOverrides
}

export function createApp(config: AppConfig, overrides: AppOverrides = {}) {
  const database = overrides.database ?? createDatabase(config.databaseUrl)
  const clock = overrides.clock ?? systemClock
  const sendMagicLink = overrides.sendMagicLink ?? createSendMagicLink(config.mailer)

  const auth = createAuth({ config: config.auth, database, sendMagicLink })
  const dns = createDnsModule({ config: config.dns, database, clock }, overrides.dns)
  const claims = createClaimsModule({ config: config.claims, clock }, overrides.claims)

  const session = sessionPlugin(createCheckSession(auth))

  const api = new Elysia({ prefix: "/api" })
    .use(session)
    .use(healthRoutes(database))
    .use(dnsApp(dns))
    .use(claimsApp(claims, session))

  return new Elysia().use(openapi()).use(api).mount(auth.handler)
}
