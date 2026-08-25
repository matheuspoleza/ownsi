import { describe, expect, test } from "bun:test"
import { Elysia, type Static } from "elysia"
import type { ClaimListResponse, ClaimResponse } from "../../src/domains/api/domain.response.ts"
import { domainRoutes } from "../../src/domains/api/domain.routes.ts"
import { createDomainsModule } from "../../src/domains/domains.module.ts"
import { fixedClock } from "../../src/shared/clock.ts"
import { DEMO_CLAIMS } from "../../src/shared/demo.ts"
import {
  type CheckSession,
  type SessionUser,
  sessionPlugin,
} from "../../src/shared/http/session.ts"

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

function server(check: CheckSession = signedInAs(ADA)) {
  let issued = 0
  const module = createDomainsModule(
    { config: { driver: "demo" }, clock: fixedClock(NOW) },
    {
      generateId: () => `clm_${++issued}`,
      generateToken: () => `ownsi_v1_token_${issued}`,
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

type ClaimBody = Static<typeof ClaimResponse>
type ClaimListBody = Static<typeof ClaimListResponse>
type ErrorBody = { error: { code: string } }

const bodyOf = async <Shape>(response: Response) => (await response.json()) as Shape

const claim = async (app: ReturnType<typeof server>, domain: string) => {
  const response = await post(app, "/domains", { domain })
  return { status: response.status, body: await bodyOf<ClaimBody>(response) }
}

describe("claiming a domain", () => {
  test("issues a token and names the record to create", async () => {
    const { status, body } = await claim(server(), "acme.com")

    expect(status).toBe(201)
    expect(body.status).toBe("pending")
    expect(body.record).toEqual({
      host: "_ownsi-challenge",
      name: "_ownsi-challenge.acme.com",
      type: "TXT",
      value: "ownsi_v1_token_1",
    })
  })

  test("normalises what was typed before anything is issued", async () => {
    const { body } = await claim(server(), "HTTP://WWW.Acme.com/path")

    expect(body.domain).toBe("acme.com")
    expect(body.record.name).toBe("_ownsi-challenge.acme.com")
  })

  test("refuses a second claim on the same domain and keeps the first token", async () => {
    const app = server()
    const first = await claim(app, "acme.com")
    const second = await post(app, "/domains", { domain: "acme.com" })

    expect(second.status).toBe(409)
    const reread = await bodyOf<ClaimBody>(await get(app, `/domains/${first.body.id}`))
    expect(reread.record.value).toBe(first.body.record.value)
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

  test("a claim belongs to the account that made it", async () => {
    const app = server(signedInAs(ADA))
    const mine = await claim(app, "acme.com")

    const asGrace = new Elysia().use(
      domainRoutes(
        createDomainsModule({ config: { driver: "demo" }, clock: fixedClock(NOW) }),
        sessionPlugin(signedInAs(GRACE)),
      ),
    )

    expect((await get(asGrace, `/domains/${mine.body.id}`)).status).toBe(404)
  })
})

describe("the lifecycle", () => {
  test("archiving and reactivating preserves the token", async () => {
    const app = server()
    const { body } = await claim(app, "acme.com")

    const archived = await bodyOf<ClaimBody>(await post(app, `/domains/${body.id}/archive`))
    expect(archived.status).toBe("archived")

    const restored = await bodyOf<ClaimBody>(await post(app, `/domains/${body.id}/restore`))
    expect(restored.status).toBe("pending")
    expect(restored.record.value).toBe(body.record.value)
  })

  test("asking for a check revives a dormant claim", async () => {
    const app = server()
    const { body } = await claim(app, "dormant.ownsi.dev")
    expect(body.status).toBe("paused")

    const resumed = await bodyOf<ClaimBody>(await post(app, `/domains/${body.id}/verify`))
    expect(resumed.status).toBe("pending")
    expect(resumed.record.value).toBe(body.record.value)
  })

  test("a claim that is not yours cannot be moved", async () => {
    const response = await post(server(), "/domains/clm_nobody/archive")
    expect(response.status).toBe(404)
  })
})

describe("the demo catalogue over the wire", () => {
  test.each(DEMO_CLAIMS.map((demo) => [demo.domain, demo] as const))(
    "%s renders its screen",
    async (domain, demo) => {
      const { status, body } = await claim(server(), domain)

      expect(status).toBe(201)
      expect(body.status).toBe(demo.status)
      expect(body.lastOutcome).toBe(demo.lastOutcome)
      expect(body.diagnosis?.code ?? null).toBe(demo.diagnosis?.code ?? null)
    },
  )

  test("a diagnosis arrives with its cause and its fix already written", async () => {
    const { body } = await claim(server(), "record-at-apex.ownsi.dev")
    const diagnosis = body.diagnosis

    if (diagnosis?.code !== "record_at_apex") throw new Error("the fixture stopped reproducing it")

    expect(diagnosis.cause).toContain("record-at-apex.ownsi.dev")
    expect(diagnosis.fix).toContain("_ownsi-challenge")
    expect(diagnosis.observed).toEqual({
      name: "record-at-apex.ownsi.dev",
      value: "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058",
    })
  })

  test("the list carries every claim on the account", async () => {
    const app = server()
    await claim(app, "proved.ownsi.dev")
    await claim(app, "negative-cache.ownsi.dev")

    const { claims } = await bodyOf<ClaimListBody>(await get(app, "/domains"))
    expect(claims.map((entry) => entry.domain).sort()).toEqual([
      "negative-cache.ownsi.dev",
      "proved.ownsi.dev",
    ])
  })
})
