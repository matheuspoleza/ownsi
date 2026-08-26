import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

const DOCS = join(import.meta.dir, "..")

const ROUTE = /\/api\/[A-Za-z0-9_:{}$./*-]*/g

/**
 * Not in the OpenAPI document on purpose. better-auth is mounted whole and the front end
 * reaches it with its own client; the Inngest and health routes are machinery.
 */
const OUTSIDE_THE_DOCUMENT = ["/api/auth", "/api/inngest", "/api/health"]

type Document = { readonly paths: Record<string, unknown> }

const document = (await Bun.file(join(DOCS, "openapi.json")).json()) as Document

const documented = Object.keys(document.paths).map(segmentsOf)

const served = new Set(
  [...documented, ...OUTSIDE_THE_DOCUMENT.map(segmentsOf)].flatMap((path) =>
    path[0] === undefined ? [] : [path[0]],
  ),
)

const waived = OUTSIDE_THE_DOCUMENT.map(segmentsOf)

describe("routes written in prose", () => {
  test("the document has paths to check against", () => {
    expect(documented.length).toBeGreaterThan(0)
  })

  test("every one of them is a route this API still serves", async () => {
    const stale: string[] = []

    for (const page of await pages(DOCS)) {
      const source = await Bun.file(page).text()

      for (const [written] of source.matchAll(ROUTE)) {
        const candidate = segmentsOf(trimmed(written))
        if (!isRoute(candidate) || reaches(candidate)) continue

        stale.push(`${relative(DOCS, page)} -> ${trimmed(written)}`)
      }
    }

    expect(stale).toEqual([])
  })
})

/**
 * A path under a segment this API serves. Anything else carrying `/api/` is a filesystem
 * path — `apps/api/src/…` — and claims to be no route at all.
 */
function isRoute(candidate: readonly string[]): boolean {
  return candidate[0] !== undefined && served.has(candidate[0])
}

/**
 * A prose route is honest when it names a documented path, or a prefix of one — "everything
 * under /api/verifications" is true as long as something lives there.
 */
function reaches(candidate: readonly string[]): boolean {
  return [...documented, ...waived].some((path) => covers(path, candidate))
}

function covers(path: readonly string[], candidate: readonly string[]): boolean {
  return (
    path.length >= candidate.length &&
    candidate.every((segment, index) => {
      const against = path[index]
      return against !== undefined && (against.startsWith("{") || against === segment)
    })
  )
}

/** The segments under `/api`, so `/api/claims/{id}` reads as `["claims", "{id}"]`. */
function segmentsOf(path: string): readonly string[] {
  return path.replace(/\/+$/, "").split("/").slice(2)
}

function trimmed(written: string): string {
  return written.replace(/[.,;:)`"'*]+$/, "")
}

async function pages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const found = await Promise.all(
    entries.map((entry) => {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) return []
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return pages(path)
      return entry.name.endsWith(".mdx") ? [path] : []
    }),
  )
  return found.flat()
}
