import { promises as dnsPromises, Resolver } from "node:dns"
import {
  answered,
  type DnsRecord,
  failed,
  type LookupFailure,
  normalizeHostname,
  type RecordType,
  type SoaRecord,
  soaToWireFormat,
} from "../domain/dns.ts"
import type { AskNameserver } from "../domain/ports.ts"

type NodeSoa = Awaited<ReturnType<typeof dnsPromises.resolveSoa>>

export function nodeNameserver(timeoutMs = 2_500, tries = 1): AskNameserver {
  return async (name, type, nameserver, signal) => {
    const startedAt = performance.now()
    const resolver = new Resolver({ timeout: timeoutMs, tries })
    const origin = () => ({
      question: { name, type },
      resolver: normalizeHostname(nameserver),
      latencyMs: Math.round(performance.now() - startedAt),
    })

    try {
      const addresses = await dnsPromises.resolve4(nameserver)
      if (addresses.length === 0) return failed(origin(), "NETWORK_ERROR")

      resolver.setServers(addresses)
      signal?.addEventListener("abort", () => resolver.cancel(), { once: true })

      if (type === "SOA") {
        const soa = toSoaRecord(await resolveSoa(resolver, name))
        return answered(origin(), "NOERROR", [soaAsRecord(normalizeHostname(name), soa)], soa)
      }

      const values = await resolveRecords(resolver, name, type)
      return answered(origin(), "NOERROR", values.map(toRecord(normalizeHostname(name), type)))
    } catch (error) {
      return failed(origin(), failureOf(error))
    }
  }
}

function failureOf(error: unknown): LookupFailure {
  switch ((error as { code?: string })?.code) {
    case "ETIMEOUT":
    case "ETIMEDOUT":
      return "TIMEOUT"
    case "SERVFAIL":
      return "SERVFAIL"
    case "REFUSED":
      return "REFUSED"
    default:
      return "NETWORK_ERROR"
  }
}

function resolveSoa(resolver: Resolver, name: string): Promise<NodeSoa> {
  return new Promise((resolve, reject) => {
    resolver.resolveSoa(name, (error, soa) => (error ? reject(error) : resolve(soa)))
  })
}

function resolveRecords(resolver: Resolver, name: string, type: RecordType): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const handler = (error: unknown, result: unknown) =>
      error ? reject(error) : resolve(flatten(result))

    switch (type) {
      case "NS":
        return resolver.resolveNs(name, handler)
      case "TXT":
        return resolver.resolveTxt(name, handler)
      case "CNAME":
        return resolver.resolveCname(name, handler)
      case "A":
        return resolver.resolve4(name, handler)
      case "AAAA":
        return resolver.resolve6(name, handler)
      case "MX":
        return resolver.resolveMx(name, handler)
      default:
        return reject(new Error(`Unsupported record type: ${type}`))
    }
  })
}

function flatten(result: unknown): string[] {
  if (!Array.isArray(result)) return []

  return result.map((entry) => {
    if (Array.isArray(entry)) return entry.join("")
    if (entry && typeof entry === "object" && "exchange" in entry) {
      const mail = entry as { priority?: number; exchange?: string }
      return `${mail.priority ?? 0} ${mail.exchange ?? ""}`
    }
    return String(entry)
  })
}

function toRecord(name: string, type: RecordType) {
  return (data: string): DnsRecord => ({
    name,
    type,
    ttl: 0,
    data: type === "TXT" ? data : normalizeHostname(data),
  })
}

function toSoaRecord(soa: NodeSoa): SoaRecord {
  return {
    primaryNameserver: normalizeHostname(soa.nsname),
    hostmaster: normalizeHostname(soa.hostmaster),
    serial: soa.serial,
    refreshSeconds: soa.refresh,
    retrySeconds: soa.retry,
    expireSeconds: soa.expire,
    negativeCacheTtlSeconds: soa.minttl,
  }
}

function soaAsRecord(name: string, soa: SoaRecord): DnsRecord {
  return { name, type: "SOA", ttl: soa.negativeCacheTtlSeconds, data: soaToWireFormat(soa) }
}
