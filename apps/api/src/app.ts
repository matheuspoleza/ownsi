import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"
import { authApp } from "./auth/auth.app.ts"
import { type AuthModuleOverrides, createAuthModule } from "./auth/auth.module.ts"
import { claimsApp } from "./claims/claims.app.ts"
import type { ClaimEvent } from "./claims/claims.contract.ts"
import { type ClaimsModuleOverrides, createClaimsModule } from "./claims/claims.module.ts"
import type { AppConfig } from "./config.ts"
import { domainsApp } from "./domains/domains.app.ts"
import type { DomainEvent } from "./domains/domains.contract.ts"
import { createDomainsModule, type DomainsModuleOverrides } from "./domains/domains.module.ts"
import { proofApp, proofPageApp } from "./proof/proof.app.ts"
import { createProofModule, type ProofModuleOverrides } from "./proof/proof.module.ts"
import { type Broadcast, inProcessBroadcast } from "./shared/broadcast.ts"
import { type EventBus, inProcessBus } from "./shared/bus.ts"
import type { Clock } from "./shared/clock.ts"
import { systemClock } from "./shared/clock.ts"
import { createDatabase, type Database } from "./shared/database.ts"
import { createSendEmail, type SendEmail } from "./shared/email.ts"
import { eventRoutes, type StreamEvent } from "./shared/http/events.routes.ts"
import { healthRoutes } from "./shared/http/health.routes.ts"
import { inngestRoutes } from "./shared/http/inngest.routes.ts"
import { openApiDocumentation } from "./shared/http/openapi.ts"
import { sessionPlugin } from "./shared/http/session.ts"
import { createInngest, type InngestClient } from "./shared/inngest.ts"
import { maskEmail } from "./shared/masked-email.ts"
import { verificationRunner } from "./verification/infra/verification-runner.service.ts"
import {
  inngestScheduleVerification,
  inngestStopSchedule,
  manualScheduling,
  manualStopSchedule,
} from "./verification/infra/verification-schedule.service.ts"
import { verificationApp } from "./verification/verification.app.ts"
import { challengeHost, type VerificationEvent } from "./verification/verification.contract.ts"
import {
  createVerificationModule,
  type VerificationModuleOverrides,
} from "./verification/verification.module.ts"
import { zonesApp } from "./zones/zones.app.ts"
import { providerName } from "./zones/zones.contract.ts"
import { createZonesModule, type ZonesModuleOverrides } from "./zones/zones.module.ts"

export type AppEvent = VerificationEvent | DomainEvent | ClaimEvent

const HEARTBEAT_MS = 20_000

export type AppOverrides = {
  readonly database?: Database
  readonly clock?: Clock
  readonly sendEmail?: SendEmail
  readonly inngest?: InngestClient | null
  readonly bus?: EventBus<AppEvent>
  readonly broadcast?: Broadcast<StreamEvent>
  readonly auth?: AuthModuleOverrides
  readonly zones?: ZonesModuleOverrides
  readonly verification?: VerificationModuleOverrides
  readonly domains?: DomainsModuleOverrides
  readonly claims?: ClaimsModuleOverrides
  readonly proof?: ProofModuleOverrides
}

export function createApp(config: AppConfig, overrides: AppOverrides = {}) {
  const database = overrides.database ?? createDatabase(config.databaseUrl)
  const clock = overrides.clock ?? systemClock
  const sendEmail = overrides.sendEmail ?? createSendEmail(config.mailer)
  const inngest = overrides.inngest ?? clientFor(config)
  const bus = overrides.bus ?? inProcessBus<AppEvent>()
  const broadcast =
    overrides.broadcast ??
    inProcessBroadcast<StreamEvent>({
      heartbeat: () => ({ type: "heartbeat" }),
      heartbeatMs: HEARTBEAT_MS,
    })

  const auth = createAuthModule({ config: config.auth, sendEmail, database }, overrides.auth)
  const zones = createZonesModule({ config: config.zones, database, clock }, overrides.zones)

  const verification = createVerificationModule(
    {
      config: config.verification,
      clock,
      database,
      describeZone: zones.describeZone,
      publish: bus.publish,
      schedule: inngest === null ? manualScheduling : inngestScheduleVerification(inngest),
      stopSchedule: inngest === null ? manualStopSchedule : inngestStopSchedule(inngest),
    },
    overrides.verification,
  )

  const domains = createDomainsModule({ clock, database, publish: bus.publish }, overrides.domains)

  const claims = createClaimsModule(
    {
      config: { appUrl: config.appUrl },
      clock,
      database,
      sendEmail,
      findDomain: async (input) => {
        const found = await domains.getDomain(input)
        return found.ok ? found.value : null
      },
      findDomains: (userId) => domains.listDomainNames(userId),
      startVerifying: async (input) => {
        const started = await verification.createVerification(input)
        return started.ok ? started.value.id : null
      },
      stopVerifying: async (input) => {
        await verification.stopVerification(input)
      },
      publish: bus.publish,
    },
    overrides.claims,
  )

  const proof = createProofModule(
    {
      clock,
      database,
      findProvedClaim: async ({ userId, email, claimId }) => {
        const found = await claims.getClaim({ userId, claimId })
        if (!found.ok) return null

        const { claim, domain } = found.value
        if (claim.state !== "proved") return null

        return {
          claimId: claim.id,
          domain: domain.nameAscii,
          unicodeDomain: domain.nameUnicode,
          heldBy: maskEmail(email),
          token: claim.token,
          challengeHost: challengeHost(domain.nameAscii),
          provedAt: claim.endedAt,
        }
      },
      readProvider: async (domain) => {
        const described = await zones.describeZone(domain)
        return described.type === "delegated" ? providerName(described.provider) : null
      },
    },
    overrides.proof,
  )

  bus.on("verification/attempt.succeeded", async ({ subjectId, at }) => {
    await claims.proveClaim({ claimId: subjectId, at })
  })
  bus.on("verification/attempt.failed", async ({ subjectId, diagnosis, since, at }) => {
    await claims.notifyClaimant({ claimId: subjectId, diagnosis, since, at })
  })
  bus.on("verification/exhausted", async ({ subjectId, at }) => {
    await claims.expireClaim({ claimId: subjectId, at })
  })
  bus.on("domains/domain.archived", async ({ userId, domainId }) => {
    for (const { claim } of await claims.listClaims({ userId, domainId })) {
      if (claim.state === "pending") await claims.cancelClaim({ userId, claimId: claim.id })
    }
  })

  bus.on("verification/attempt.succeeded", async ({ verificationId, subjectId, ownerId }) => {
    broadcast.publish(ownerId, { type: "verification.ran", verificationId, claimId: subjectId })
  })
  bus.on("verification/attempt.failed", async ({ verificationId, subjectId, ownerId }) => {
    broadcast.publish(ownerId, { type: "verification.ran", verificationId, claimId: subjectId })
  })
  bus.on("verification/exhausted", async ({ verificationId, subjectId, ownerId }) => {
    broadcast.publish(ownerId, { type: "verification.ran", verificationId, claimId: subjectId })
  })
  bus.on("claims/claim.ended", async ({ userId, claimId, domainId }) => {
    broadcast.publish(userId, { type: "claim.ended", claimId, domainId })
  })
  bus.on("domains/domain.archived", async ({ userId, domainId }) => {
    broadcast.publish(userId, { type: "domain.archived", domainId })
  })

  const session = sessionPlugin(auth.checkSession)

  const api = new Elysia({ prefix: "/api" })
    .use(session)
    .use(healthRoutes(database))
    .use(eventRoutes(broadcast, session))
    .use(zonesApp(zones))
    .use(domainsApp(domains, session))
    .use(claimsApp(claims, session))
    .use(proofApp(proof, session, { appUrl: config.appUrl }))
    .use(verificationApp(verification, session))

  const document = openapi({ documentation: openApiDocumentation(config.appUrl) })
  const server = new Elysia()
    .use(document)
    .use(api)
    .use(proofPageApp(proof, { appUrl: config.appUrl }))
    .use(authApp(auth))

  if (inngest === null) return server

  return server.use(
    inngestRoutes({
      client: inngest,
      functions: [verificationRunner(inngest, verification.verifyUntilDeadline)],
      signingKey: config.inngest.signingKey,
    }),
  )
}

function clientFor(config: AppConfig): InngestClient | null {
  return config.inngest.driver === "manual" ? null : createInngest(config.inngest)
}
