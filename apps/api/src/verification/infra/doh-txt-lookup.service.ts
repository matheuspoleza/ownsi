import { joinTextChunks } from "../../shared/txt-chunks.ts"
import type {
  HostPresence,
  HostRecords,
  ResolverReading,
} from "../domain/methods/txt/observation.ts"
import type { LookupTxt } from "../domain/methods/txt/ports.ts"

export const TXT_RESOLVERS = {
  google: "https://dns.google/resolve",
  cloudflare: "https://cloudflare-dns.com/dns-query",
  quad9: "https://dns.quad9.net:5053/dns-query",
} as const

export type TxtResolverId = keyof typeof TXT_RESOLVERS

const TXT_TYPE = 16
const CNAME_TYPE = 5

const RECORD_NAMES: Record<number, string> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  6: "SOA",
  15: "MX",
  16: "TXT",
  28: "AAAA",
}

const NOERROR = 0
const NXDOMAIN = 3

type Entry = { name?: string; type?: number; data?: string }
type Body = { Status?: number; Answer?: Entry[] }

export function dohTxtLookup(resolvers: readonly TxtResolverId[], timeoutMs = 4_000): LookupTxt {
  return async (name, signal) => {
    const readings = resolvers.map((resolver) => askOne(resolver, name, timeoutMs, signal))
    return Promise.all(readings)
  }
}

async function askOne(
  resolver: TxtResolverId,
  name: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ResolverReading> {
  try {
    const response = await fetch(
      `${TXT_RESOLVERS[resolver]}?name=${encodeURIComponent(name)}&type=TXT`,
      { headers: { accept: "application/dns-json" }, signal: deadline(signal, timeoutMs) },
    )
    if (!response.ok) return { resolver, type: "failed", failure: "unreachable" }

    return interpret(resolver, name, (await response.json()) as Body)
  } catch {
    return { resolver, type: "failed", failure: "unreachable" }
  }
}

function interpret(resolver: string, name: string, body: Body): ResolverReading {
  const status = body.Status ?? NOERROR
  if (status !== NOERROR && status !== NXDOMAIN) {
    return { resolver, type: "failed", failure: "servfail" }
  }

  return { resolver, type: "answered", records: recordsOf(name, status, body.Answer ?? []) }
}

function recordsOf(name: string, status: number, answer: readonly Entry[]): HostRecords {
  const txt = answer
    .filter((entry) => entry.type === TXT_TYPE)
    .map((entry) => joinTextChunks(entry.data ?? ""))

  const cname = answer.find((entry) => entry.type === CNAME_TYPE)?.data ?? null
  const otherTypes = [
    ...new Set(
      answer
        .filter((entry) => entry.type !== TXT_TYPE)
        .map((entry) => RECORD_NAMES[entry.type ?? -1] ?? "unknown"),
    ),
  ].sort()

  return {
    name,
    presence: presenceOf(status, answer.length, txt.length),
    txt,
    cname: cname === null ? null : cname.replace(/\.$/, ""),
    otherTypes,
  }
}

function presenceOf(status: number, answers: number, texts: number): HostPresence {
  if (status === NXDOMAIN) return "nxdomain"
  if (texts > 0) return "present"
  return answers > 0 ? "nodata" : "nxdomain"
}

function deadline(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}
