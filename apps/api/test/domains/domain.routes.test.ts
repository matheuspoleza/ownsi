import { describe, expect, test } from "bun:test"
import { Elysia, type Static } from "elysia"
import type { DomainListResponse, DomainResponse } from "../../src/domains/api/domain.response.ts"
import { domainRoutes } from "../../src/domains/api/domain.routes.ts"
import { statusWhilePending } from "../../src/domains/domain/claim-lifecycle.ts"
import { createDomainsModule } from "../../src/domains/domains.module.ts"
import { DEMO_DOMAINS, type DemoClaim } from "../../src/domains/infra/demo.ts"
import { fixedClock } from "../../src/shared/clock.ts"
import type { Database } from "../../src/shared/database.ts"
import {
  type CheckSession,
  type SessionUser,
  sessionPlugin,
} from "../../src/shared/http/session.ts"
import type { CheckChallenge } from "../../src/verification/verification.contract.ts"
import { inMemoryDomainRepository } from "./in-memory-domain-repository.ts"
import { inMemorySentNotices } from "./in-memory-sent-notices.ts"

const ADA: SessionUser = { id: "usr_ada", email: "ada@example.com", name: "Ada" }
const GRACE: SessionUser = { id: "usr_grace", email: "grace@example.com", name: "Grace" }

const NOW = new Date("2026-08-24T12:00:00Z")

const signedInAs =
  (user: SessionUser): CheckSession =>
  async () => ({
    type: "authenticated",
    user,
  })

const signedOut: CheckSession = async () => ({ type: "anonymous" })

const resolversUnreachable: CheckChallenge = async () => ({
  type: "unresolvable",
  resolvers: [],
})

function server(check: CheckSession = signedInAs(ADA)) {
  let ids = 0
  let tokens = 0
  const module = createDomainsModule(
    {
      config: { driver: "demo", appUrl: "https://ownsi.dev" },
      clock: fixedClock(NOW),
      database: {} as Database,
      checkChallenge: resolversUnreachable,
      sendEmail: async () => {},
      scheduleClaim: async () => {},
    },
    {
      domains: inMemoryDomainRepository(),
      announce: async () => {},
      otherClaimants: async () => [],
      sentNotices: inMemorySentNotices(),
      generateId: (prefix) => `${prefix}_${++ids}`,
      generateToken: () => `ownsi_v1_token_${++tokens}`,
    },
  )

  return new Elysia().use(domainRoutes(module, sessionPlugin(check)))
}

const post = (app: ReturnType<typeof server>, path: string, body?: unknown) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  )

const get = (app: ReturnType<typeof server>, path: string) =>
  app.handle(new Request(`http://localhost${path}`))

type DomainBody = Static<typeof DomainResponse>
type DomainListBody = Static<typeof DomainListResponse>
type ErrorBody = { error: { code: string } }

const bodyOf = async <Shape>(response: Response) => (await response.json()) as Shape

const claim = async (app: ReturnType<typeof server>, domain: string) => {
  const response = await post(app, "/domains", { domain })
  return { status: response.status, body: await bodyOf<DomainBody>(response) }
}

const openRecords = (body: DomainBody) =>
  "records" in body.claim ? body.claim.records : ([] as const)

const statusOf = (demo: DemoClaim) => {
  if (demo.state !== "pending") return demo.state
  if (demo.check?.outcome !== "absent") return "pending"
  return statusWhilePending(demo.check.diagnosis.code)
}

describe("claiming a domain", () => {
  test("issues a token and names the record to create", async () => {
    const { status, body } = await claim(server(), "acme.com")

    expect(status).toBe(201)
    expect(body.claim.status).toBe("pending")
    expect(openRecords(body)).toEqual([
      {
        host: "_ownsi-challenge",
        name: "_ownsi-challenge.acme.com",
        type: "TXT",
        value: "ownsi_v1_token_1",
      },
    ])
  })

  test("normalises what was typed before anything is issued", async () => {
    const { body } = await claim(server(), "HTTP://WWW.Acme.com/path")

    expect(body.name).toBe("acme.com")
    expect(openRecords(body)[0]?.name).toBe("_ownsi-challenge.acme.com")
  })

  test("refuses a second claim while one is open, and keeps the first token", async () => {
    const app = server()
    const first = await claim(app, "acme.com")
    const second = await post(app, "/domains", { domain: "acme.com" })

    expect(second.status).toBe(409)
    expect((await bodyOf<ErrorBody>(second)).error.code).toBe("already_claimed")

    const reread = await bodyOf<DomainBody>(await get(app, `/domains/${first.body.id}`))
    expect(reread.claim.token).toBe(first.body.claim.token)
  })

  test("answers 400 on something that is not a domain", async () => {
    const response = await post(server(), "/domains", { domain: "not a domain" })
    expect(response.status).toBe(400)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("invalid_domain")
  })
})

describe("the collection route", () => {
  test("answers whether or not the caller sends a trailing slash", async () => {
    const app = server()

    expect((await get(app, "/domains")).status).toBe(200)
    expect((await get(app, "/domains/")).status).toBe(200)
  })
})

describe("the session", () => {
  test("a signed-out visitor never reaches a claim", async () => {
    const app = server(signedOut)

    expect((await post(app, "/domains", { domain: "acme.com" })).status).toBe(401)
    expect((await get(app, "/domains")).status).toBe(401)
  })

  test("a domain belongs to the account that claimed it", async () => {
    const app = server(signedInAs(ADA))
    const mine = await claim(app, "acme.com")

    const asGrace = new Elysia().use(
      domainRoutes(
        createDomainsModule(
          {
            config: { driver: "demo", appUrl: "https://ownsi.dev" },
            clock: fixedClock(NOW),
            database: {} as Database,
            checkChallenge: resolversUnreachable,
            sendEmail: async () => {},
            scheduleClaim: async () => {},
          },
          {
            domains: inMemoryDomainRepository(),
            announce: async () => {},
            otherClaimants: async () => [],
            sentNotices: inMemorySentNotices(),
          },
        ),
        sessionPlugin(signedInAs(GRACE)),
      ),
    )

    expect((await get(asGrace, `/domains/${mine.body.id}`)).status).toBe(404)
  })
})

describe("a claim only runs forwards", () => {
  test("cancelling ends the claim and leaves it as history", async () => {
    const app = server()
    const { body } = await claim(app, "acme.com")

    const canceled = await bodyOf<DomainBody>(await post(app, `/domains/${body.id}/cancel`))

    expect(canceled.claim.status).toBe("canceled")
    expect(openRecords(canceled)).toEqual([])
  })

  test("an ended claim takes no action at all", async () => {
    const app = server()
    const { body } = await claim(app, "acme.com")
    await post(app, `/domains/${body.id}/cancel`)

    for (const action of ["verify", "cancel"]) {
      const response = await post(app, `/domains/${body.id}/${action}`)
      expect(response.status).toBe(409)
      expect((await bodyOf<ErrorBody>(response)).error.code).toBe("claim_ended")
    }
  })

  test("claiming again issues a new token and keeps the old claim as history", async () => {
    const app = server()
    const { body } = await claim(app, "acme.com")
    await post(app, `/domains/${body.id}/cancel`)

    const again = await claim(app, "acme.com")

    expect(again.body.id).toBe(body.id)
    expect(again.body.claim.status).toBe("pending")
    expect(again.body.claim.token).not.toBe(body.claim.token)
    expect(again.body.history.map((entry) => entry.status)).toEqual(["canceled"])
  })

  test("archiving ends the open claim and leaves the list", async () => {
    const app = server()
    const { body } = await claim(app, "acme.com")

    const archived = await bodyOf<DomainBody>(await post(app, `/domains/${body.id}/archive`))
    expect(archived.archived).toBe(true)
    expect(archived.claim.status).toBe("canceled")

    const { domains } = await bodyOf<DomainListBody>(await get(app, "/domains"))
    expect(domains.map((entry) => entry.name)).toEqual([])

    expect((await get(app, `/domains/${body.id}`)).status).toBe(200)
  })

  test("a domain that is not yours cannot be moved", async () => {
    const response = await post(server(), "/domains/dom_nobody/archive")
    expect(response.status).toBe(404)
  })
})

describe("the demo catalogue over the wire", () => {
  test.each(DEMO_DOMAINS.map((demo) => [demo.domain, demo] as const))(
    "%s renders its screen",
    async (domain, demo) => {
      const { status, body } = await claim(server(), domain)

      expect(status).toBe(201)
      expect(body.claim.status).toBe(statusOf(demo.claim))
      expect(body.claim.lastOutcome).toBe(demo.claim.check?.outcome ?? null)
      expect(body.history).toHaveLength(demo.history.length)
      expect(body.archived).toBe(demo.archivedDaysAgo !== null)
    },
  )

  test("a diagnosis arrives with its cause and its fix already written", async () => {
    const { body } = await claim(server(), "record-at-apex.ownsi.dev")
    const diagnosis = body.claim.diagnosis

    if (diagnosis?.code !== "record_at_apex") throw new Error("the fixture stopped reproducing it")

    expect(diagnosis.cause).toContain("record-at-apex.ownsi.dev")
    expect(diagnosis.fix).toContain("_ownsi-challenge")
    expect(diagnosis.observed).toEqual({
      name: "record-at-apex.ownsi.dev",
      value: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
    })
  })

  test("a second proof dates itself without moving the first", async () => {
    const { body } = await claim(server(), "reproved.ownsi.dev")

    expect(body.claim.status).toBe("proved")
    expect(body.firstVerifiedAt).not.toBeNull()
    expect(body.lastConfirmedAt).not.toBeNull()
    expect(Date.parse(body.lastConfirmedAt ?? "")).toBeGreaterThan(
      Date.parse(body.firstVerifiedAt ?? ""),
    )
  })

  test("the list carries every domain on the account", async () => {
    const app = server()
    await claim(app, "proved.ownsi.dev")
    await claim(app, "negative-cache.ownsi.dev")

    const { domains } = await bodyOf<DomainListBody>(await get(app, "/domains"))
    expect(domains.map((entry) => entry.name).sort()).toEqual([
      "negative-cache.ownsi.dev",
      "proved.ownsi.dev",
    ])
  })
})
