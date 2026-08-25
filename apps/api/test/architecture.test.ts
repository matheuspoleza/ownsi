import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"

const SRC = join(import.meta.dir, "../src")

const IMPORT = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+["']([^"']+)["']/g

type Rule = {
  readonly name: string
  readonly appliesTo: (path: string) => boolean
  readonly forbids: readonly RegExp[]
}

const REACHES_THE_WORLD = [
  /^node:/,
  /^bun(:|$)/,
  /^elysia/,
  /^@elysiajs\//,
  /^@ownsi\/db/,
  /^@prisma\//,
  /^inngest/,
  /^resend/,
  /^better-auth/,
]

const CONTEXT_MAP: Record<string, readonly string[]> = {
  auth: [],
  zones: [],
  domains: [],
  verification: ["zones"],
  claims: ["domains", "verification"],
  proof: ["claims"],
}

const RULES: readonly Rule[] = [
  {
    name: "domain/ stays pure and knows no other layer",
    appliesTo: (path) => path.includes("/domain/"),
    forbids: [...REACHES_THE_WORLD, /\.\.\/(api|application|infra)\//],
  },
  {
    name: "application/ orchestrates ports, never adapters or routes",
    appliesTo: (path) => path.includes("/application/"),
    forbids: [/^elysia/, /^@elysiajs\//, /^@ownsi\/db/, /^@prisma\//, /\.\.\/(api|infra)\//],
  },
  {
    name: "api/ speaks HTTP, never to an adapter directly",
    appliesTo: (path) => path.includes("/api/"),
    forbids: [/\.\.\/infra\//],
  },
  {
    name: "*.module.ts wires a context without knowing about HTTP",
    appliesTo: (path) => path.endsWith(".module.ts"),
    forbids: [/^elysia/, /^@elysiajs\//, /\.\/api\//],
  },
  {
    name: "*.app.ts mounts routes and reaches for no adapter",
    appliesTo: (path) => path.endsWith(".app.ts"),
    forbids: [/\/infra\//],
  },
  {
    name: "*.contract.ts publishes its own domain and nothing downstream of it",
    appliesTo: (path) => path.endsWith(".contract.ts"),
    forbids: [...REACHES_THE_WORLD, /\.\/(api|application|infra)\//],
  },
  {
    name: "shared/ depends on no bounded context",
    appliesTo: (path) => path.startsWith("shared/"),
    forbids: [/\.\.\/(auth|zones|domains|claims|proof|verification)\//],
  },
]

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

async function boundedContexts(): Promise<string[]> {
  const entries = await readdir(SRC, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "shared")
    .map((entry) => entry.name)
}

function reachedContext(
  context: string,
  specifier: string,
  contexts: readonly string[],
): string | undefined {
  return contexts.find((other) => other !== context && specifier.includes(`../${other}/`))
}

function allowed(context: string, reached: string, specifier: string): boolean {
  const declared = (CONTEXT_MAP[context] ?? []).includes(reached)
  return declared && specifier.endsWith(`${reached}/${reached}.contract.ts`)
}

async function importsOf(path: string): Promise<string[]> {
  const source = await Bun.file(path).text()
  return [...source.matchAll(IMPORT)].map(([, specifier]) => specifier ?? "")
}

describe("layer boundaries", () => {
  test("every rule has files to police", async () => {
    const files = (await sourceFiles(SRC)).map((path) => relative(SRC, path))
    expect(files.length).toBeGreaterThan(0)

    for (const rule of RULES) {
      expect(
        files.filter((file) => rule.appliesTo(`/${file}`) || rule.appliesTo(file)).length,
      ).toBeGreaterThan(0)
    }
  })

  test.each(RULES.map((rule) => [rule.name, rule] as const))("%s", async (_name, rule) => {
    const violations: string[] = []

    for (const path of await sourceFiles(SRC)) {
      const relativePath = relative(SRC, path)
      if (!rule.appliesTo(`/${relativePath}`) && !rule.appliesTo(relativePath)) continue

      for (const specifier of await importsOf(path)) {
        if (rule.forbids.some((pattern) => pattern.test(specifier))) {
          violations.push(`${relativePath} imports ${specifier}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  test("a context reaches another only through its published contract", async () => {
    const contexts = await boundedContexts()
    const violations: string[] = []

    for (const context of contexts) {
      for (const path of await sourceFiles(join(SRC, context))) {
        for (const specifier of await importsOf(path)) {
          const reached = reachedContext(context, specifier, contexts)
          if (reached && !allowed(context, reached, specifier)) {
            violations.push(`${relative(SRC, path)} imports ${specifier}`)
          }
        }
      }
    }

    expect(violations).toEqual([])
  })

  test("the context map has no cycle", () => {
    const seen = new Set<string>()

    const walk = (context: string, path: readonly string[]): string[] => {
      if (path.includes(context)) return [...path, context]
      seen.add(context)
      for (const next of CONTEXT_MAP[context] ?? []) {
        const cycle = walk(next, [...path, context])
        if (cycle.length > 0) return cycle
      }
      return []
    }

    const cycles = Object.keys(CONTEXT_MAP).flatMap((context) =>
      seen.has(context) ? [] : [walk(context, [])],
    )

    expect(cycles.filter((cycle) => cycle.length > 0)).toEqual([])
  })
})
