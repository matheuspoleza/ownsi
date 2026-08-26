import { type AppOverrides, createApp } from "../src/app.ts"
import type { ClaimAnnouncement } from "../src/claims/domain/ports.ts"
import type { AppConfig } from "../src/config.ts"
import type { Database } from "../src/shared/database.ts"
import type { CheckSession, SessionUser } from "../src/shared/http/session.ts"
import type { CheckChallenge } from "../src/verification/domain/attempt.ts"
import type { AttemptOutcome } from "../src/verification/verification.contract.ts"
import { inMemoryClaimRepository } from "./claims/in-memory-claim-repository.ts"
import { inMemorySentNotices } from "./claims/in-memory-sent-notices.ts"
import { inMemoryDomainListing } from "./domains/in-memory-domain-listing.ts"
import { inMemoryDomainRepository } from "./domains/in-memory-domain-repository.ts"
import { inMemoryProofLinkRepository } from "./proof/in-memory-proof-link-repository.ts"
import { inMemoryVerificationRepository } from "./verification/in-memory-verification-repository.ts"
import { inMemoryZoneRepository } from "./zones/in-memory-zone-repository.ts"

export const ADA: SessionUser = { id: "usr_ada", email: "ada@example.com", name: "Ada" }

export const GRACE: SessionUser = { id: "usr_grace", email: "grace@example.com", name: "Grace" }

const PEOPLE: readonly SessionUser[] = [ADA, GRACE]

export const TEST_CONFIG: AppConfig = {
  port: 0,
  appUrl: "https://ownsi.dev",
  databaseUrl: "postgresql://unused",
  auth: {
    secret: "harness-secret-long-enough-to-pass",
    baseUrl: "https://ownsi.dev",
    basePath: "/api/auth",
    magicLinkTtlSeconds: 600,
    google: null,
  },
  mailer: { driver: "log", apiKey: "", from: "ownsi <no-reply@ownsi.dev>" },
  inngest: {
    driver: "manual",
    id: "ownsi",
    isDev: true,
    baseUrl: null,
    eventKey: "",
    signingKey: "",
  },
  zones: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    zoneCacheTtlSeconds: 300,
    soaBudgetMs: 2_500,
  },
  verification: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    authoritativeBudgetMs: 2_500,
  },
}

export const signedInAs =
  (user: SessionUser): CheckSession =>
  async () => ({ type: "authenticated", user })

export const signedOut: CheckSession = async () => ({ type: "anonymous" })

export const UNREACHABLE: AttemptOutcome = { type: "unresolvable", resolvers: [] }

/** The storage one app writes to, so a second app can read the same records back. */
export type Records = {
  readonly claims: ReturnType<typeof inMemoryClaimRepository>
  readonly domains: ReturnType<typeof inMemoryDomainRepository>
  readonly verifications: ReturnType<typeof inMemoryVerificationRepository>
  readonly proofLinks: ReturnType<typeof inMemoryProofLinkRepository>
}

export type HarnessOptions = {
  readonly now?: Date
  /** Another harness's records, for a second app reading what the first one wrote. */
  readonly records?: Records
  readonly session?: CheckSession
  readonly answers?: () => AttemptOutcome
  /** When another account has proved the same name more recently than the claim under test. */
  readonly latestProof?: Date
  /** Somebody else's proof of the same name, as the repository would hand it over. */
  readonly coexistence?: { readonly maskedEmail: string; readonly provedAt: string }
  readonly overrides?: AppOverrides
}

export function harness(options: HarnessOptions = {}) {
  const claims = options.records?.claims ?? inMemoryClaimRepository()
  const domains = options.records?.domains ?? inMemoryDomainRepository()
  const verifications = options.records?.verifications ?? inMemoryVerificationRepository()
  const proofLinks = options.records?.proofLinks ?? inMemoryProofLinkRepository()
  const notified: ClaimAnnouncement[] = []
  const asked: Parameters<CheckChallenge>[] = []

  let now = options.now ?? new Date("2026-08-24T12:00:00Z")
  let ids = 0
  let tokens = 0
  let slugs = 0

  const app = createApp(TEST_CONFIG, {
    database: {} as Database,
    clock: () => now,
    sendEmail: async () => {},
    auth: { checkSession: options.session ?? signedInAs(ADA) },
    zones: { zones: inMemoryZoneRepository() },
    domains: {
      domains,
      listing: inMemoryDomainListing(domains, claims),
      generateId: (prefix) => `${prefix}_${++ids}`,
    },
    claims: {
      claims,
      sentNotices: inMemorySentNotices(),
      findCoexistence: async () => options.coexistence ?? null,
      findRecipient: async (userId) => {
        const person = PEOPLE.find((one) => one.id === userId)
        return person === undefined ? null : { email: person.email, name: person.name }
      },
      findLatestProof: async () =>
        options.latestProof === undefined
          ? null
          : { maskedEmail: "g•••@example.com", provedAt: options.latestProof },
      otherClaimants: async () => [],
      sendNotice: async (announcement) => {
        notified.push(announcement)
      },
      generateId: (prefix) => `${prefix}_${++ids}`,
      generateToken: () => `ownsi_v1_token_${++tokens}`,
    },
    proof: {
      links: proofLinks,
      generateSlug: () => `slug${++slugs}`,
    },
    verification: {
      verifications,
      generateId: (prefix) => `${prefix}_${++ids}`,
      checkChallenge: async (method, challenge) => {
        asked.push([method, challenge])
        return options.answers?.() ?? UNREACHABLE
      },
    },
    ...options.overrides,
  })

  const send = (method: string, path: string, body?: unknown) =>
    app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )

  return {
    app,
    claims,
    domains,
    verifications,
    proofLinks,
    records: { claims, domains, verifications, proofLinks },
    notified,
    asked,
    at: (instant: Date) => {
      now = instant
    },
    get: (path: string) => app.handle(new Request(`http://localhost${path}`)),
    post: (path: string, body?: unknown) => send("POST", path, body ?? {}),
    del: (path: string) => send("DELETE", path),
  }
}

export async function bodyOf<Shape>(response: Response): Promise<Shape> {
  return (await response.json()) as Shape
}

export type ErrorBody = { readonly error: { readonly code: string } }
