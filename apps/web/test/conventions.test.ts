import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"

const SRC = join(import.meta.dir, "../src")

const ENTRYPOINTS = new Set(["main.tsx", "router.tsx", "styles.css", "vite-env.d.ts"])
const SUFFIXED = /\.(component|page|modal|route|constants|utils|api|client)\.(ts|tsx)$/
const PASCAL_SUFFIXED = /\.(component|page|modal|route)\.tsx$/
const RENDERS_JSX = /\.(component|page|modal|route)\.tsx$/
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/
const HOOK = /^use[A-Z][A-Za-z0-9]*\.ts$/

const TOOL_DIRECTIVE = /^\s*\/\/\s*(biome-ignore|@ts-|eslint-)/
const IMPORT_FROM = /^\s*(?:import|export)\s[^"']*from\s+["'](\.[^"']+)["']/

const sourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
    }),
  )
  return files.flat()
}

const scan = async (
  predicate: (line: string, path: string) => boolean,
  within: (path: string) => boolean = () => true,
): Promise<string[]> => {
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

const importsOf = async (path: string): Promise<string[]> => {
  const lines = (await Bun.file(join(SRC, path)).text()).split("\n")
  return lines.flatMap((line) => {
    const match = line.match(IMPORT_FROM)
    return match?.[1] ? [relative(SRC, resolve(SRC, dirname(path), match[1]))] : []
  })
}

const pageOf = (path: string): string | null => path.match(/^pages\/([^/]+)\//)?.[1] ?? null

describe("file naming", () => {
  test("every file is an entrypoint, a hook, or carries a known suffix", async () => {
    const stray = (await sourceFiles(SRC))
      .map((path) => relative(SRC, path))
      .filter((path) => {
        const name = path.split("/").pop() ?? ""
        if (ENTRYPOINTS.has(name)) return false
        if (path.includes("hooks/")) return !HOOK.test(name)
        return !SUFFIXED.test(name)
      })
    expect(stray).toEqual([])
  })

  test("PascalCase names a component, or a file that belongs to one", async () => {
    const paths = (await sourceFiles(SRC)).map((path) => relative(SRC, path))
    const owners = new Set(
      paths
        .filter((path) => PASCAL_SUFFIXED.test(path))
        .map((path) => `${dirname(path)}/${path.split("/").pop()?.split(".")[0]}`),
    )

    const misnamed = paths.filter((path) => {
      const name = path.split("/").pop() ?? ""
      if (ENTRYPOINTS.has(name) || path.includes("hooks/")) return false
      const stem = name.split(".")[0] ?? ""
      if (PASCAL_SUFFIXED.test(name)) return !PASCAL_CASE.test(stem)
      if (PASCAL_CASE.test(stem)) return !owners.has(`${dirname(path)}/${stem}`)
      return !CAMEL_CASE.test(stem)
    })
    expect(misnamed).toEqual([])
  })

  test("no barrel files", async () => {
    const barrels = (await sourceFiles(SRC))
      .map((path) => relative(SRC, path))
      .filter((path) => /(^|\/)index\.tsx?$/.test(path))
    expect(barrels).toEqual([])
  })
})

describe("components", () => {
  test("are arrow functions, not declarations", async () => {
    const declarations = await scan(
      (line) => /(^|\s)function\s/.test(line),
      (path) => RENDERS_JSX.test(path),
    )
    expect(declarations).toEqual([])
  })

  test("take a named props type, never an inline object", async () => {
    const inline = await scan(
      (line) => /\}:\s*\{/.test(line) || /:\s*React\.FC/.test(line),
      (path) => RENDERS_JSX.test(path),
    )
    expect(inline).toEqual([])
  })
})

describe("colocation", () => {
  test("a page never imports another page's private files", async () => {
    const crossings: string[] = []

    for (const path of (await sourceFiles(SRC)).map((file) => relative(SRC, file))) {
      const page = pageOf(path)
      if (!page) continue
      for (const target of await importsOf(path)) {
        const targetPage = pageOf(target)
        if (targetPage && targetPage !== page) crossings.push(`${path} -> ${target}`)
      }
    }
    expect(crossings).toEqual([])
  })

  test("shared components and hooks never import from a page", async () => {
    const reaches: string[] = []

    for (const path of (await sourceFiles(SRC)).map((file) => relative(SRC, file))) {
      if (!/^(components|hooks|lib|api)\//.test(path)) continue
      for (const target of await importsOf(path)) {
        if (target.startsWith("pages/")) reaches.push(`${path} -> ${target}`)
      }
    }
    expect(reaches).toEqual([])
  })
})

describe("comments", () => {
  test("code carries no explanatory comments", async () => {
    const comments = await scan((line) => /^\s*\/\//.test(line) && !TOOL_DIRECTIVE.test(line))
    expect(comments).toEqual([])
  })

  test("block comments are JSDoc or nothing", async () => {
    const blocks = await scan((line) => /^\s*\/\*(?!\*)/.test(line))
    expect(blocks).toEqual([])
  })
})
