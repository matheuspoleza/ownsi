import {
  type AnswerOrigin,
  answered,
  type DnsAnswer,
  type DnsRecord,
  failed,
  type LookupFailure,
  normalizeHostname,
  parseSoaRecord,
  type RecordType,
  type SoaRecord,
  type ZoneStatus,
} from "../domain/dns.ts"
import type { DnsResolver } from "../domain/ports.ts"

export const DOH_ENDPOINTS = {
  google: "https://dns.google/resolve",
  cloudflare: "https://cloudflare-dns.com/dns-query",
  quad9: "https://dns.quad9.net:5053/dns-query",
} as const

export type DohResolverId = keyof typeof DOH_ENDPOINTS

const RECORD_TYPES: Record<number, RecordType> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  6: "SOA",
  15: "MX",
  16: "TXT",
  28: "AAAA",
}

const SOA_TYPE_NUMBER = 6

const ZONE_STATUSES: Record<number, ZoneStatus> = { 0: "NOERROR", 3: "NXDOMAIN" }
const LOOKUP_FAILURES: Record<number, LookupFailure> = { 2: "SERVFAIL", 5: "REFUSED" }

type DohEntry = { name?: string; type?: number; TTL?: number; data?: string }
type DohBody = { Status?: number; Answer?: DohEntry[]; Authority?: DohEntry[] }

export function dohResolver(id: DohResolverId, timeoutMs = 4_000): DnsResolver {
  return {
    id,
    async query(name, type, signal) {
      const startedAt = performance.now()
      const origin = () => ({
        question: { name, type },
        resolver: id,
        latencyMs: Math.round(performance.now() - startedAt),
      })

      try {
        const response = await fetch(endpointFor(id, name, type), {
          headers: { accept: "application/dns-json" },
          signal: deadline(signal, timeoutMs),
        })
        if (!response.ok) return failed(origin(), "NETWORK_ERROR")

        return interpret(origin(), (await response.json()) as DohBody)
      } catch (error) {
        return failed(origin(), timedOut(error) ? "TIMEOUT" : "NETWORK_ERROR")
      }
    },
  }
}

function endpointFor(id: DohResolverId, name: string, type: RecordType): string {
  return `${DOH_ENDPOINTS[id]}?name=${encodeURIComponent(name)}&type=${type}`
}

function deadline(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

function timedOut(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError"
}

function interpret(origin: AnswerOrigin, body: DohBody): DnsAnswer {
  const code = body.Status ?? 0
  const status = ZONE_STATUSES[code]
  if (status === undefined) return failed(origin, LOOKUP_FAILURES[code] ?? "SERVFAIL")

  return answered(
    origin,
    status,
    (body.Answer ?? []).flatMap(toRecord),
    soaFromAuthority(body.Authority ?? []),
  )
}

function toRecord(entry: DohEntry): DnsRecord[] {
  const type = RECORD_TYPES[entry.type ?? -1]
  if (!type || entry.data === undefined) return []

  return [
    {
      name: normalizeHostname(entry.name ?? ""),
      type,
      ttl: entry.TTL ?? 0,
      data: type === "TXT" ? joinTextChunks(entry.data) : entry.data.replace(/\.$/, ""),
    },
  ]
}

function joinTextChunks(data: string): string {
  const chunks = data.match(/"(?:[^"\\]|\\.)*"/g)
  if (!chunks) return data.replace(/^"|"$/g, "")
  return chunks.map((chunk) => chunk.slice(1, -1).replace(/\\(.)/g, "$1")).join("")
}

function soaFromAuthority(authority: readonly DohEntry[]): SoaRecord | null {
  return parseSoaRecord(authority.find((entry) => entry.type === SOA_TYPE_NUMBER)?.data)
}
