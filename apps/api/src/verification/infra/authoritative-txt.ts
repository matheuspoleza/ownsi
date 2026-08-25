import { promises as dnsPromises, Resolver } from "node:dns"
import type { AskAuthoritativeTxt, AuthoritativeTxt } from "../domain/methods/txt/ports.ts"

const MAX_NAMESERVERS_ASKED = 3

export function nodeAuthoritativeTxt(timeoutMs = 2_500): AskAuthoritativeTxt {
  return async (name, nameservers, signal) => {
    const asked = nameservers.slice(0, MAX_NAMESERVERS_ASKED)
    if (asked.length === 0) return { type: "unknown" }

    const answers = await Promise.all(
      asked.map((nameserver) => askOne(name, nameserver, timeoutMs, signal)),
    )

    const values = answers.filter((answer): answer is string[] => answer !== null)
    return reading(asked, values)
  }
}

async function askOne(
  name: string,
  nameserver: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<string[] | null> {
  const resolver = new Resolver({ timeout: timeoutMs, tries: 1 })

  try {
    const addresses = await dnsPromises.resolve4(nameserver)
    if (addresses.length === 0) return null

    resolver.setServers(addresses)
    signal?.addEventListener("abort", () => resolver.cancel(), { once: true })

    return await resolveTxt(resolver, name)
  } catch (error) {
    return absent(error) ? [] : null
  }
}

function absent(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  return code === "ENOTFOUND" || code === "ENODATA"
}

function resolveTxt(resolver: Resolver, name: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    resolver.resolveTxt(name, (error, records) =>
      error ? reject(error) : resolve(records.map((chunks) => chunks.join(""))),
    )
  })
}

function reading(nameservers: readonly string[], values: readonly string[][]): AuthoritativeTxt {
  if (values.length === 0) return { type: "silent", nameservers }

  return { type: "answered", nameservers, txt: values.flat() }
}
