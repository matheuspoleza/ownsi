import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { join } from "node:path"
import {
  DIAGNOSTICS_PATH,
  DOCS_DIRECTORY,
  diagnosticsCatalogue,
  OPENAPI_PATH,
  openApiDocument,
} from "../scripts/emit-docs.ts"

const SRC = join(import.meta.dir, "../src")

describe("the emitted documentation", () => {
  test("the committed OpenAPI document matches the server — else `bun run docs:emit`", async () => {
    const committed = await Bun.file(OPENAPI_PATH).text()
    expect(committed).toBe(await openApiDocument())
  })

  test("the committed catalogue matches the diagnosis vocabulary — else `bun run docs:emit`", async () => {
    const committed = await Bun.file(DIAGNOSTICS_PATH).text()
    expect(committed).toBe(diagnosticsCatalogue())
  })

  test("every error code the API returns has an entry on the errors page", async () => {
    const page = await Bun.file(join(DOCS_DIRECTORY, "errors.mdx")).text()
    const headings = new Set(captures(page, /^## (\w+)$/gm))

    const emitted = new Set<string>()
    for (const path of await sourceFiles(SRC)) {
      const source = await Bun.file(path).text()
      for (const code of captures(source, /errorResponse\("(\w+)"/g)) emitted.add(code)
    }

    expect(emitted.size).toBeGreaterThan(0)
    expect([...emitted].filter((code) => !headings.has(code))).toEqual([])
  })
})

function captures(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].flatMap(([, captured]) => (captured ? [captured] : []))
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      return entry.name.endsWith(".ts") ? [path] : []
    }),
  )
  return files.flat()
}
