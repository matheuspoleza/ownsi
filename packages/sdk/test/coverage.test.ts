import { describe, expect, test } from "bun:test"
import { join } from "node:path"

const OPENAPI = join(import.meta.dir, "../../../apps/docs/openapi.json")

/** Every operation the API publishes, and the call that reaches it. */
const REACHED: Readonly<Record<string, string>> = {
  "POST /api/domains/": "ownsi.domains.findOrCreate",
  "GET /api/domains/": "ownsi.domains.list",
  "GET /api/domains/{id}": "ownsi.domains.get",
  "POST /api/domains/{id}/archive": "domain.archive",
  "POST /api/domains/{id}/unarchive": "domain.unarchive",
  "DELETE /api/domains/{id}": "domain.delete",
  "POST /api/claims/": "ownsi.claims.create · domain.claim",
  "GET /api/claims/": "ownsi.claims.list · domain.claims · domain.proof",
  "GET /api/claims/{id}": "ownsi.claims.get",
  "POST /api/claims/{id}/cancel": "claim.cancel",
  "POST /api/claims/{id}/proof_links": "ownsi.proof.publish · claim.share",
  "GET /api/claims/{id}/proof_links": "ownsi.proof.list · claim.shares",
  "POST /api/claims/{id}/proof_links/{slug}/revoke": "link.revoke",
  "GET /api/verifications/{id}": "ownsi.verifications.get · claim.verification",
  "GET /api/verifications/{id}/attempts": "verification.attempts",
  "POST /api/verifications/{id}/runs": "verification.run · claim.recheck",
  "GET /api/proofs/{slug}": "ownsi.proof.read",
  "GET /api/zones/{name}": "ownsi.zones.read",
  "GET /api/events": "ownsi.events.subscribe",
}

/** Published, and deliberately not wrapped. The reason is the point of the entry. */
const NOT_REACHED: Readonly<Record<string, string>> = {}

type Document = { readonly paths: Record<string, Record<string, unknown>> }

const document = (await Bun.file(OPENAPI).json()) as Document

const published = Object.entries(document.paths).flatMap(([path, methods]) =>
  Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
)

describe("what the SDK reaches", () => {
  test("the document has operations to check against", () => {
    expect(published.length).toBeGreaterThan(0)
  })

  test("every operation the API publishes is reached, or written down as not", () => {
    const unaccounted = published.filter(
      (operation) => !(operation in REACHED) && !(operation in NOT_REACHED),
    )

    expect(unaccounted).toEqual([])
  })

  test("nothing claims to reach an operation the API no longer publishes", () => {
    const serves = new Set(published)
    const orphaned = [...Object.keys(REACHED), ...Object.keys(NOT_REACHED)].filter(
      (operation) => !serves.has(operation),
    )

    expect(orphaned).toEqual([])
  })
})
