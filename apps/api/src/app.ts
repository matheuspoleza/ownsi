import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"
import type { AppConfig } from "./config.ts"
import { domainsApp } from "./domains/domains.app.ts"
import { createDomainsModule, type DomainsModuleOverrides } from "./domains/domains.module.ts"
import { createAuth, createCheckSession } from "./shared/auth.ts"
import type { Clock } from "./shared/clock.ts"
import { systemClock } from "./shared/clock.ts"
import { createDatabase, type Database } from "./shared/database.ts"
import { healthRoutes } from "./shared/http/health.routes.ts"
import { openApiDocumentation } from "./shared/http/openapi.ts"
import { sessionPlugin } from "./shared/http/session.ts"
import { createSendMagicLink, type SendMagicLink } from "./shared/mailer.ts"
import { zonesApp } from "./zones/zones.app.ts"
import { createZonesModule, type ZonesModuleOverrides } from "./zones/zones.module.ts"

export type AppOverrides = {
  readonly database?: Database
  readonly clock?: Clock
  readonly sendMagicLink?: SendMagicLink
  readonly zones?: ZonesModuleOverrides
  readonly domains?: DomainsModuleOverrides
}

export function createApp(config: AppConfig, overrides: AppOverrides = {}) {
  const database = overrides.database ?? createDatabase(config.databaseUrl)
  const clock = overrides.clock ?? systemClock
  const sendMagicLink = overrides.sendMagicLink ?? createSendMagicLink(config.mailer)

  const auth = createAuth({ config: config.auth, database, sendMagicLink })
  const zones = createZonesModule({ config: config.zones, database, clock }, overrides.zones)
  const domains = createDomainsModule({ config: config.domains, clock }, overrides.domains)

  const session = sessionPlugin(createCheckSession(auth))

  const api = new Elysia({ prefix: "/api" })
    .use(session)
    .use(healthRoutes(database))
    .use(zonesApp(zones))
    .use(domainsApp(domains, session))

  const document = openapi({ documentation: openApiDocumentation(config.appUrl) })

  return new Elysia().use(document).use(api).mount(auth.handler)
}
