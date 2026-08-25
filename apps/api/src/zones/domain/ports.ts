import type { DnsAnswer, RecordType } from "./dns.ts"
import type { Zone } from "./zone.ts"

export type DnsResolver = {
  readonly id: string
  readonly query: (name: string, type: RecordType, signal?: AbortSignal) => Promise<DnsAnswer>
}

export type AskNameserver = (
  name: string,
  type: RecordType,
  nameserver: string,
  signal?: AbortSignal,
) => Promise<DnsAnswer>

export type ZoneRepository = {
  readonly findByRequestedName: (requestedName: string) => Promise<Zone | null>
  readonly save: (requestedName: string, zone: Zone) => Promise<void>
}
