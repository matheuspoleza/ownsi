import { normalizeHostname } from "./hostname.ts"

export { normalizeHostname }

export type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "SOA" | "TXT"

export type DnsQuestion = {
  readonly name: string
  readonly type: RecordType
}

export type DnsRecord = {
  readonly name: string
  readonly type: RecordType
  readonly ttl: number
  readonly data: string
}

export type SoaRecord = {
  readonly primaryNameserver: string
  readonly hostmaster: string
  readonly serial: number
  readonly refreshSeconds: number
  readonly retrySeconds: number
  readonly expireSeconds: number
  readonly negativeCacheTtlSeconds: number
}

export type ZoneStatus = "NOERROR" | "NXDOMAIN"

export type LookupFailure = "SERVFAIL" | "REFUSED" | "TIMEOUT" | "NETWORK_ERROR"

export type AnswerOrigin = {
  readonly question: DnsQuestion
  readonly resolver: string
  readonly latencyMs: number
}

export type AnsweredDns = AnswerOrigin & {
  readonly type: "answered"
  readonly status: ZoneStatus
  readonly records: readonly DnsRecord[]
  readonly authoritySoa: SoaRecord | null
}

export type FailedDns = AnswerOrigin & {
  readonly type: "failed"
  readonly reason: LookupFailure
}

export type DnsAnswer = AnsweredDns | FailedDns

export function answered(
  origin: AnswerOrigin,
  status: ZoneStatus,
  records: readonly DnsRecord[] = [],
  authoritySoa: SoaRecord | null = null,
): AnsweredDns {
  return {
    ...origin,
    question: normalizeQuestion(origin.question),
    type: "answered",
    status,
    records,
    authoritySoa,
  }
}

export function failed(origin: AnswerOrigin, reason: LookupFailure): FailedDns {
  return { ...origin, question: normalizeQuestion(origin.question), type: "failed", reason }
}

function normalizeQuestion(question: DnsQuestion): DnsQuestion {
  return { name: normalizeHostname(question.name), type: question.type }
}

export function normalizeHostnameList(values: readonly string[]): readonly string[] {
  return values
    .map(normalizeHostname)
    .filter((host) => host.length > 0)
    .sort()
}

export function recordsOfType(answer: AnsweredDns, type: RecordType): readonly DnsRecord[] {
  return answer.records.filter((record) => record.type === type)
}

export function soaOf(answer: AnsweredDns): SoaRecord | null {
  return answer.authoritySoa ?? parseSoaRecord(recordsOfType(answer, "SOA")[0]?.data)
}

const SOA_WIRE_FIELDS = 7

export function parseSoaRecord(data: string | undefined): SoaRecord | null {
  if (!data) return null

  const fields = data.trim().split(/\s+/)
  if (fields.length < SOA_WIRE_FIELDS) return null

  const [primaryNameserver, hostmaster, ...rest] = fields as [string, string, ...string[]]
  const numbers = rest.slice(0, 5).map(Number)
  if (numbers.length < 5 || numbers.some((value) => !Number.isFinite(value))) return null

  const [serial, refreshSeconds, retrySeconds, expireSeconds, negativeCacheTtlSeconds] =
    numbers as [number, number, number, number, number]

  return {
    primaryNameserver: normalizeHostname(primaryNameserver),
    hostmaster: normalizeHostname(hostmaster),
    serial,
    refreshSeconds,
    retrySeconds,
    expireSeconds,
    negativeCacheTtlSeconds,
  }
}

export function soaToWireFormat(soa: SoaRecord): string {
  return [
    soa.primaryNameserver,
    soa.hostmaster,
    soa.serial,
    soa.refreshSeconds,
    soa.retrySeconds,
    soa.expireSeconds,
    soa.negativeCacheTtlSeconds,
  ].join(" ")
}
