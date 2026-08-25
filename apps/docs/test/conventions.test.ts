import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

const DOCS = join(import.meta.dir, "..")

const LINK = /href="(\/[^"]*)"|\]\((\/[^)]*)\)/g

type Group = { readonly openapi?: string; readonly pages?: readonly unknown[] }
type Tab = { readonly groups?: readonly Group[]; readonly pages?: readonly unknown[] }
type Config = {
  readonly navigation: { readonly tabs: readonly Tab[] }
  readonly favicon: string
}

const config = (await Bun.file(join(DOCS, "docs.json")).json()) as Config

const navigated = new Set(
  config.navigation.tabs.flatMap((tab) => [
    ...pagesOf(tab.pages),
    ...(tab.groups ?? []).flatMap((group) => pagesOf(group.pages)),
  ]),
)

const specs = config.navigation.tabs.flatMap((tab) =>
  (tab.groups ?? []).flatMap((group) => (group.openapi ? [group.openapi] : [])),
)

const authored = (await pages(DOCS)).map((path) => relative(DOCS, path).replace(/\.mdx$/, ""))

describe("the navigation", () => {
  test("lists every page that exists", () => {
    expect(authored.filter((page) => !navigated.has(page)).sort()).toEqual([])
  })

  test("points at no page that does not exist", () => {
    const written = new Set(authored)
    expect([...navigated].filter((page) => !written.has(page)).sort()).toEqual([])
  })

  test("references an OpenAPI document that is on disk", async () => {
    expect(specs.length).toBeGreaterThan(0)
    for (const spec of specs) expect(await Bun.file(join(DOCS, spec)).exists()).toBe(true)
  })

  test("references a favicon that is on disk", async () => {
    expect(await Bun.file(join(DOCS, config.favicon)).exists()).toBe(true)
  })
})

describe("every page", () => {
  test("opens with frontmatter carrying a title and a description", async () => {
    const missing: string[] = []

    for (const page of authored) {
      const source = await Bun.file(join(DOCS, `${page}.mdx`)).text()
      const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)

      if (!frontmatter?.[1]?.includes("title:")) missing.push(`${page}: title`)
      if (!frontmatter?.[1]?.includes("description:")) missing.push(`${page}: description`)
    }

    expect(missing).toEqual([])
  })

  test("links to a page on this site that exists", async () => {
    const written = new Set(authored)
    const broken: string[] = []

    for (const page of authored) {
      const source = await Bun.file(join(DOCS, `${page}.mdx`)).text()

      for (const [, attribute, markdown] of source.matchAll(LINK)) {
        const target = (attribute ?? markdown ?? "").split("#")[0]?.replace(/^\//, "")
        if (target && !written.has(target)) broken.push(`${page} -> /${target}`)
      }
    }

    expect(broken).toEqual([])
  })
})

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

function pagesOf(entries: readonly unknown[] = []): string[] {
  return entries.filter((entry): entry is string => typeof entry === "string")
}
