import {
  type AnsweredDns,
  answered,
  type DnsRecord,
  failed,
  normalizeHostname,
  type RecordType,
  type SoaRecord,
} from "../domain/dns.ts"
import type { AskNameserver, DnsResolver } from "../domain/ports.ts"

export type DnsFixture = {
  readonly status?: AnsweredDns["status"]
  readonly records?: readonly DnsRecord[]
  readonly authoritySoa?: SoaRecord | null
}

export type DnsFixtures = Record<string, DnsFixture>

export function fixtureKey(name: string, type: RecordType): string {
  return `${normalizeHostname(name)}|${type}`
}

function lookup(fixtures: DnsFixtures, name: string, type: RecordType, resolver: string) {
  const origin = { question: { name, type }, resolver, latencyMs: 1 }
  const fixture = fixtures[fixtureKey(name, type)]
  if (!fixture) return answered(origin, "NXDOMAIN")

  return answered(
    origin,
    fixture.status ?? "NOERROR",
    fixture.records,
    fixture.authoritySoa ?? null,
  )
}

export function fakeResolver(fixtures: DnsFixtures, id = "fake"): DnsResolver {
  return { id, query: async (name, type) => lookup(fixtures, name, type, id) }
}

export function fakeNameserver(fixtures: DnsFixtures): AskNameserver {
  return async (name, type, nameserver) =>
    lookup(fixtures, name, type, normalizeHostname(nameserver))
}

export function unreachableResolver(
  id: string,
  reason: "TIMEOUT" | "SERVFAIL" | "REFUSED" | "NETWORK_ERROR" = "TIMEOUT",
): DnsResolver {
  return {
    id,
    query: async (name, type) =>
      failed({ question: { name, type }, resolver: id, latencyMs: 1 }, reason),
  }
}
