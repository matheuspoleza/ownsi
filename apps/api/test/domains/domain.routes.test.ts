import { describe, expect, test } from "bun:test"
import type { Static } from "elysia"
import type { DomainListResponse, DomainResponse } from "../../src/domains/api/domain.response.ts"
import { bodyOf, type ErrorBody, GRACE, harness, signedInAs, signedOut } from "../harness.ts"

type DomainBody = Static<typeof DomainResponse>
type DomainListBody = Static<typeof DomainListResponse>

describe("putting a domain on an account", () => {
  test("answers 201 with the name, and nothing about its status", async () => {
    const app = harness()
    const response = await app.post("/api/domains", { domain: "acme.com" })

    expect(response.status).toBe(201)
    expect(await bodyOf<DomainBody>(response)).toMatchObject({
      name: "acme.com",
      unicodeName: "acme.com",
      archived: false,
    })
  })

  test("asking twice returns the same domain", async () => {
    const app = harness()
    const first = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const again = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "ACME.com." }))

    expect(again.id).toBe(first.id)
  })

  test("a name that is not a domain is refused by code", async () => {
    const app = harness()
    const response = await app.post("/api/domains", { domain: "not a domain" })

    expect(response.status).toBe(400)
    expect((await bodyOf<ErrorBody>(response)).error.code).toBe("invalid_domain")
  })

  test("a unicode name keeps both spellings", async () => {
    const app = harness()
    const created = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "café.com" }))

    expect(created.name).toBe("xn--caf-dma.com")
    expect(created.unicodeName).toBe("café.com")
  })
})

describe("reading them back", () => {
  test("the list leaves archived names out, and the id still reads", async () => {
    const app = harness()
    const kept = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))
    const gone = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "old.com" }))
    await app.post(`/api/domains/${gone.id}/archive`)

    const { domains } = await bodyOf<DomainListBody>(await app.get("/api/domains"))
    expect(domains.map((domain) => domain.id)).toEqual([kept.id])

    const read = await bodyOf<DomainBody>(await app.get(`/api/domains/${gone.id}`))
    expect(read.archived).toBe(true)
  })

  test("another account's domain reads as missing, not as forbidden", async () => {
    const app = harness()
    const mine = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))

    const theirs = harness({ session: signedInAs(GRACE), overrides: {} })
    const response = await theirs.get(`/api/domains/${mine.id}`)

    expect(response.status).toBe(404)
  })

  test("a domain nobody put there is 404", async () => {
    const app = harness()

    expect((await app.get("/api/domains/dom_nothing")).status).toBe(404)
  })
})

describe("erasing one", () => {
  test("delete answers 204 and the domain stops existing", async () => {
    const app = harness()
    const domain = await bodyOf<DomainBody>(await app.post("/api/domains", { domain: "acme.com" }))

    expect((await app.del(`/api/domains/${domain.id}`)).status).toBe(204)
    expect((await app.get(`/api/domains/${domain.id}`)).status).toBe(404)
  })
})

describe("the session", () => {
  test("every domain route needs one", async () => {
    const app = harness({ session: signedOut })

    for (const response of [
      await app.get("/api/domains"),
      await app.post("/api/domains", { domain: "acme.com" }),
      await app.get("/api/domains/dom_1"),
      await app.post("/api/domains/dom_1/archive"),
      await app.del("/api/domains/dom_1"),
    ]) {
      expect(response.status).toBe(401)
    }
  })
})
