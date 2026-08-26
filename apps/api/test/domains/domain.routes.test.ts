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

describe("the list a dashboard reads", () => {
  const named = async (app: ReturnType<typeof harness>, name: string) =>
    bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))

  test("a name nobody claimed yet says so, and the tally agrees", async () => {
    const app = harness()
    await named(app, "acme.com")

    const page = await bodyOf<DomainListBody>(await app.get("/api/domains"))

    expect(page.domains[0]).toMatchObject({ status: "unclaimed", claimId: null })
    expect(page.counts).toMatchObject({ unclaimed: 1, pending: 0 })
    expect(page.nextCursor).toBeNull()
  })

  test("opening a claim moves the name, and carries what the row renders", async () => {
    const app = harness()
    const domain = await named(app, "acme.com")
    await app.post("/api/claims", { domainId: domain.id })

    const page = await bodyOf<DomainListBody>(await app.get("/api/domains"))

    expect(page.domains[0]).toMatchObject({ status: "pending" })
    expect(page.domains[0]?.verificationId).not.toBeNull()
    expect(page.domains[0]?.claimStartedAt).not.toBeNull()
    expect(page.counts).toMatchObject({ unclaimed: 0, pending: 1 })
  })

  test("the cursor walks the account without repeating or skipping a name", async () => {
    const app = harness()
    for (const name of ["one.com", "two.com", "three.com"]) await named(app, name)

    const first = await bodyOf<DomainListBody>(await app.get("/api/domains?limit=2"))
    expect(first.domains).toHaveLength(2)
    expect(first.nextCursor).toBe(first.domains[1]?.id ?? "")

    const second = await bodyOf<DomainListBody>(
      await app.get(`/api/domains?limit=2&cursor=${first.nextCursor}`),
    )

    expect(second.domains).toHaveLength(1)
    expect(second.nextCursor).toBeNull()
    expect([...first.domains, ...second.domains].map((domain) => domain.name)).toEqual([
      "three.com",
      "two.com",
      "one.com",
    ])
  })

  test("filtering narrows the page and leaves the tally whole", async () => {
    const app = harness()
    const claimed = await named(app, "claimed.com")
    await named(app, "bare.com")
    await app.post("/api/claims", { domainId: claimed.id })

    const page = await bodyOf<DomainListBody>(await app.get("/api/domains?status=pending"))

    expect(page.domains.map((domain) => domain.name)).toEqual(["claimed.com"])
    expect(page.counts).toMatchObject({ pending: 1, unclaimed: 1 })
  })

  test("a status nobody is in answers an empty page, not an error", async () => {
    const app = harness()
    await named(app, "acme.com")

    const response = await app.get("/api/domains?status=proved")
    expect(response.status).toBe(200)
    expect((await bodyOf<DomainListBody>(response)).domains).toEqual([])
  })
})

describe("taking one off the list", () => {
  const named = async (app: ReturnType<typeof harness>, name: string) =>
    bodyOf<DomainBody>(await app.post("/api/domains", { domain: name }))

  test("the archived shelf is its own page, and the tally counts it apart", async () => {
    const app = harness()
    await named(app, "kept.com")
    const gone = await named(app, "old.com")
    await app.post(`/api/domains/${gone.id}/archive`)

    const list = await bodyOf<DomainListBody>(await app.get("/api/domains"))
    expect(list.domains.map((domain) => domain.name)).toEqual(["kept.com"])
    expect(list.counts).toMatchObject({ unclaimed: 1, archived: 1 })

    const shelf = await bodyOf<DomainListBody>(await app.get("/api/domains?archived=true"))
    expect(shelf.domains.map((domain) => domain.name)).toEqual(["old.com"])
    expect(shelf.domains[0]?.archived).toBe(true)
  })

  test("naming one finds it whether or not it is archived", async () => {
    const app = harness()
    const gone = await named(app, "old.com")
    await app.post(`/api/domains/${gone.id}/archive`)

    const page = await bodyOf<DomainListBody>(await app.get("/api/domains?name=old.com"))

    expect(page.domains.map((domain) => domain.id)).toEqual([gone.id])
    expect(page.domains[0]?.archived).toBe(true)
  })

  test("an archived name opens no claim, and says why", async () => {
    const app = harness()
    const gone = await named(app, "old.com")
    await app.post(`/api/domains/${gone.id}/archive`)

    const refused = await app.post("/api/claims", { domainId: gone.id })

    expect(refused.status).toBe(409)
    expect((await bodyOf<ErrorBody>(refused)).error.code).toBe("domain_archived")
    expect(await bodyOf<{ claims: readonly unknown[] }>(await app.get("/api/claims"))).toEqual({
      claims: [],
    })
  })

  test("asking for the same name back hands over the archived one, still archived", async () => {
    const app = harness()
    const gone = await named(app, "old.com")
    await app.post(`/api/domains/${gone.id}/archive`)

    const again = await named(app, "old.com")

    expect(again).toMatchObject({ id: gone.id, archived: true })
  })

  test("unarchiving puts it back on the list, opening nothing", async () => {
    const app = harness()
    const gone = await named(app, "old.com")
    await app.post(`/api/domains/${gone.id}/archive`)

    const back = await bodyOf<DomainBody>(await app.post(`/api/domains/${gone.id}/unarchive`))
    expect(back.archived).toBe(false)

    const list = await bodyOf<DomainListBody>(await app.get("/api/domains"))
    expect(list.domains).toMatchObject([{ id: gone.id, status: "unclaimed" }])
    expect(list.counts).toMatchObject({ unclaimed: 1, archived: 0 })
  })

  test("archiving twice keeps the date it was first shelved", async () => {
    const app = harness()
    const gone = await named(app, "old.com")
    await app.post(`/api/domains/${gone.id}/archive`)
    app.at(new Date("2026-09-01T12:00:00Z"))

    expect((await app.post(`/api/domains/${gone.id}/archive`)).status).toBe(200)
    expect((await app.domains.findById(gone.id))?.archivedAt).toEqual(
      new Date("2026-08-24T12:00:00Z"),
    )
  })

  test("neither act reaches another account's domain", async () => {
    const app = harness()
    const mine = await named(app, "acme.com")
    const theirs = harness({ session: signedInAs(GRACE) })

    expect((await theirs.post(`/api/domains/${mine.id}/archive`)).status).toBe(404)
    expect((await theirs.post(`/api/domains/${mine.id}/unarchive`)).status).toBe(404)
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
      await app.post("/api/domains/dom_1/unarchive"),
      await app.del("/api/domains/dom_1"),
    ]) {
      expect(response.status).toBe(401)
    }
  })
})
