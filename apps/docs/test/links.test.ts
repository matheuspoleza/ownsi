import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

const DOCS = join(import.meta.dir, "..")

const SHIPPED = join(DOCS, "..", "web", "src", "lib", "docs.constants.ts")

const PUBLISHED = /\$\{DOCS\}(\/[A-Za-z0-9/_#-]*)/g

const ANCHORED = /href="(\/[^"#]*#[^"]*)"|\]\((\/[^)#]*#[^)]*)\)/g

const HEADING = /^#{2,6}\s+(.+)$/gm

const IMAGE = /<img[^>]*\ssrc="(\/[^"]+)"/g

const authored = await pages(DOCS)

const anchors = new Map(
  await Promise.all(
    authored.map(
      async (path) =>
        [page(path), slugsOf(await Bun.file(path).text())] as const satisfies readonly [
          string,
          ReadonlySet<string>,
        ],
    ),
  ),
)

describe("every docs link the product ships", () => {
  test("names a page these docs still publish, at an anchor that is still there", async () => {
    const source = await Bun.file(SHIPPED).text()

    const dangling = [...source.matchAll(PUBLISHED)].flatMap(([, written]) =>
      written === undefined || resolves(written) ? [] : [written],
    )

    expect(dangling).toEqual([])
  })

  test("there are links to check, so a renamed constant cannot empty this test", async () => {
    const source = await Bun.file(SHIPPED).text()
    expect([...source.matchAll(PUBLISHED)].length).toBeGreaterThan(0)
  })
})

describe("every image a page shows", () => {
  test("is a file that is on disk", async () => {
    const missing: string[] = []

    for (const path of authored) {
      for (const [, src] of (await Bun.file(path).text()).matchAll(IMAGE)) {
        if (src === undefined) continue
        if (await Bun.file(join(DOCS, src)).exists()) continue

        missing.push(`${relative(DOCS, path)} -> ${src}`)
      }
    }

    expect(missing).toEqual([])
  })
})

describe("every anchor written in prose", () => {
  test("points at a heading that exists on the page it names", async () => {
    const dangling: string[] = []

    for (const path of authored) {
      for (const [, attribute, markdown] of (await Bun.file(path).text()).matchAll(ANCHORED)) {
        const written = attribute ?? markdown
        if (written === undefined || resolves(written)) continue

        dangling.push(`${relative(DOCS, path)} -> ${written}`)
      }
    }

    expect(dangling).toEqual([])
  })
})

function resolves(written: string): boolean {
  const [path, anchor] = written.split("#")
  if (path === undefined) return false

  const found = anchors.get(path.replace(/^\//, "").replace(/\/$/, "") || "index")
  if (found === undefined) return false

  return anchor === undefined || anchor === "" || found.has(anchor)
}

function slugsOf(source: string): ReadonlySet<string> {
  return new Set([...source.matchAll(HEADING)].map(([, heading]) => slug(heading ?? "")))
}

function slug(heading: string): string {
  return heading
    .trim()
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "-")
}

function page(path: string): string {
  return relative(DOCS, path).replace(/\.mdx$/, "")
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
