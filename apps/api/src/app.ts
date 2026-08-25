import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"
import { authApp } from "./auth/auth.app.ts"
import { type AuthModuleOverrides, createAuthModule } from "./auth/auth.module.ts"
import type { AppConfig } from "./config.ts"
import { domainsApp } from "./domains/domains.app.ts"
import { createDomainsModule, type DomainsModuleOverrides } from "./domains/domains.module.ts"
import {
  claimWatcher,
  inngestScheduleClaim,
  manualScheduling,
} from "./domains/infra/claim-scheduler.ts"
import type { Clock } from "./shared/clock.ts"
import { systemClock } from "./shared/clock.ts"
import { createDatabase, type Database } from "./shared/database.ts"
import { createSendEmail, type SendEmail } from "./shared/email.ts"
import { healthRoutes } from "./shared/http/health.routes.ts"
import { inngestRoutes } from "./shared/http/inngest.routes.ts"
import { openApiDocumentation } from "./shared/http/openapi.ts"
import { sessionPlugin } from "./shared/http/session.ts"
import { createInngest, type InngestClient } from "./shared/inngest.ts"
import {
  createVerificationModule,
  type VerificationModuleOverrides,
} from "./verification/verification.module.ts"
import { zonesApp } from "./zones/zones.app.ts"
import { createZonesModule, type ZonesModuleOverrides } from "./zones/zones.module.ts"

export type AppOverrides = {
  readonly database?: Database
  readonly clock?: Clock
  readonly sendEmail?: SendEmail
  readonly inngest?: InngestClient | null
  readonly auth?: AuthModuleOverrides
  readonly zones?: ZonesModuleOverrides
  readonly verification?: VerificationModuleOverrides
  readonly domains?: DomainsModuleOverrides
}

export function createApp(config: AppConfig, overrides: AppOverrides = {}) {
  const database = overrides.database ?? createDatabase(config.databaseUrl)
  const clock = overrides.clock ?? systemClock
  const sendEmail = overrides.sendEmail ?? createSendEmail(config.mailer)
  const auth = createAuthModule({ config: config.auth, sendEmail, database }, overrides.auth)
  const zones = createZonesModule({ config: config.zones, database, clock }, overrides.zones)
  const verification = createVerificationModule(
    { config: config.verification, describeZone: zones.describeZone },
    overrides.verification,
  )
  const inngest = overrides.inngest ?? clientFor(config)
  const domains = createDomainsModule(
    {
      config: config.domains,
      clock,
      database,
      checkChallenge: verification.checkChallenge,
      sendEmail,
      scheduleClaim: inngest === null ? manualScheduling : inngestScheduleClaim(inngest),
    },
    overrides.domains,
  )

  const session = sessionPlugin(auth.checkSession)

  const api = new Elysia({ prefix: "/api" })
    .use(session)
    .use(healthRoutes(database))
    .use(zonesApp(zones))
    .use(domainsApp(domains, session))

  const document = openapi({ documentation: openApiDocumentation(config.appUrl) })
  const server = new Elysia().use(document).use(api).use(authApp(auth))

  if (inngest === null) return server

  return server.use(
    inngestRoutes({
      client: inngest,
      functions: [claimWatcher(inngest, domains.checkWhenDue)],
      signingKey: config.inngest.signingKey,
    }),
  )
}

function clientFor(config: AppConfig): InngestClient | null {
  return config.inngest.driver === "manual" ? null : createInngest(config.inngest)
}
