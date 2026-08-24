import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { createApp } from "../src/app.ts"
import type { AppConfig } from "../src/config.ts"
import type { Database } from "../src/shared/database.ts"

const SRC = join(import.meta.dir, "../src")

const ALLOWED_COMMENT = /^\s*\/\/\s*(biome-ignore|@ts-|eslint-)/

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

async function scan(
  predicate: (line: string, path: string) => boolean,
  within: (path: string) => boolean = () => true,
): Promise<string[]> {
  const found: string[] = []

  for (const path of await sourceFiles(SRC)) {
    const relativePath = relative(SRC, path)
    if (!within(relativePath)) continue

    const lines = (await Bun.file(path).text()).split("\n")
    lines.forEach((line, index) => {
      if (predicate(line, relativePath)) found.push(`${relativePath}:${index + 1} ${line.trim()}`)
    })
  }
  return found
}

describe("conventions", () => {
  test("code carries no explanatory comments", async () => {
    const comments = await scan((line) => /^\s*\/\//.test(line) && !ALLOWED_COMMENT.test(line))
    expect(comments).toEqual([])
  })

  test("block comments are JSDoc on a published type or nothing", async () => {
    const blocks = await scan((line) => /^\s*\/\*(?!\*)/.test(line))
    expect(blocks).toEqual([])
  })

  test("data is plain types, not classes", async () => {
    const classes = await scan((line) => /^\s*(export\s+)?(abstract\s+)?class\s/.test(line))
    expect(classes).toEqual([])
  })

  test("domain and application return errors, never throw them", async () => {
    const throws = await scan(
      (line) => /(^|\s)throw\s/.test(line),
      (path) => path.includes("/domain/") || path.includes("/application/"),
    )
    expect(throws).toEqual([])
  })
})

const CONFIG: AppConfig = {
  port: 0,
  appUrl: "http://localhost:5173",
  databaseUrl: "postgresql://unused",
  auth: {
    secret: "conventions-test-secret",
    baseUrl: "http://localhost:5173",
    basePath: "/api/auth",
    magicLinkTtlSeconds: 600,
    google: null,
  },
  mailer: { driver: "log", apiKey: "", from: "ownsi <no-reply@ownsi.dev>" },
  dns: {
    driver: "fake",
    recursiveResolvers: [],
    resolverTimeoutMs: 4_000,
    zoneCacheTtlSeconds: 300,
    soaBudgetMs: 2_500,
  },
}

describe("the README map", () => {
  test("names every bounded context and the layers inside it", async () => {
    const readme = await Bun.file(join(import.meta.dir, "../README.md")).text()

    const directories = async (path: string) =>
      (await readdir(path, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)

    const contexts = await directories(SRC)
    const layers = (
      await Promise.all(contexts.map((context) => directories(join(SRC, context))))
    ).flat()

    const undocumented = [...new Set([...contexts, ...layers])].filter(
      (name) => !readme.includes(`${name}/`),
    )

    expect(contexts.length).toBeGreaterThan(0)
    expect(undocumented).toEqual([])
  })
})

describe("the published contract", () => {
  test("every documented route declares a response schema for each status", async () => {
    const app = createApp(CONFIG, { database: {} as Database })
    const response = await app.handle(new Request("http://localhost/openapi/json"))
    const spec = (await response.json()) as {
      paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>
    }

    const undocumented: string[] = []

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const statuses = Object.keys(operation.responses ?? {})
        if (statuses.length === 0) undocumented.push(`${method.toUpperCase()} ${path}`)
      }
    }

    expect(Object.keys(spec.paths).length).toBeGreaterThan(0)
    expect(undocumented).toEqual([])
  })

  test("the public zone read documents its three failures", async () => {
    const app = createApp(CONFIG, { database: {} as Database })
    const response = await app.handle(new Request("http://localhost/openapi/json"))
    const spec = (await response.json()) as {
      paths: Record<string, { get: { responses: Record<string, unknown> } }>
    }

    expect(Object.keys(spec.paths["/api/zones/{name}"]?.get.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "404",
      "502",
    ])
  })
})
