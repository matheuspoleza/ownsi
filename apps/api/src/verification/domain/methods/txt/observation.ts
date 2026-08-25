import type { AuthoritativeTxt } from "./ports.ts"

export const ASSUMED_NEGATIVE_CACHE_SECONDS = 300

export function readAuthority(
  answer: AuthoritativeTxt,
  token: string,
  negativeCacheTtlSeconds: number | null,
): AuthoritativeReading {
  switch (answer.type) {
    case "unknown":
      return { type: "unknown" }
    case "silent":
      return { type: "silent", nameservers: answer.nameservers }
    case "answered":
      return answer.txt.includes(token)
        ? {
            type: "holds",
            nameservers: answer.nameservers,
            negativeCacheTtlSeconds: negativeCacheTtlSeconds ?? ASSUMED_NEGATIVE_CACHE_SECONDS,
          }
        : { type: "lacks", nameservers: answer.nameservers }
  }
}

export type HostPresence = "present" | "nxdomain" | "nodata"

export type HostRecords = {
  readonly name: string
  readonly presence: HostPresence
  readonly txt: readonly string[]
  readonly cname: string | null
  readonly otherTypes: readonly string[]
}

export type ResolverFailure = "servfail" | "unreachable"

export type AnsweredReading = {
  readonly resolver: string
  readonly type: "answered"
  readonly records: HostRecords
}

export type ResolverReading =
  | AnsweredReading
  | { readonly resolver: string; readonly type: "failed"; readonly failure: ResolverFailure }

export type Quorum =
  | { readonly type: "agreed"; readonly records: HostRecords }
  | {
      readonly type: "failed"
      readonly failure: ResolverFailure
      readonly resolvers: readonly string[]
    }

export type AuthoritativeReading =
  | {
      readonly type: "holds"
      readonly nameservers: readonly string[]
      readonly negativeCacheTtlSeconds: number
    }
  | { readonly type: "lacks"; readonly nameservers: readonly string[] }
  | { readonly type: "silent"; readonly nameservers: readonly string[] }
  | { readonly type: "unknown" }

export type TxtObservation = {
  readonly challenge: Quorum
  readonly apex: HostRecords | null
  readonly www: HostRecords | null
  readonly appended: HostRecords | null
  readonly authoritative: AuthoritativeReading
}

export type TxtChallenge = {
  readonly domain: string
  readonly token: string
  readonly previousTokens: readonly string[]
}

function answeredReading(reading: ResolverReading): reading is AnsweredReading {
  return reading.type === "answered"
}

function servfailed(reading: ResolverReading): boolean {
  return reading.type === "failed" && reading.failure === "servfail"
}

export function quorum(readings: readonly ResolverReading[]): Quorum {
  const broken = readings.filter(servfailed)
  if (broken.length * 2 > readings.length) {
    return { type: "failed", failure: "servfail", resolvers: broken.map(nameOf) }
  }

  const [first, ...rest] = readings.filter(answeredReading)
  if (first === undefined) {
    return { type: "failed", failure: "unreachable", resolvers: readings.map(nameOf) }
  }

  return { type: "agreed", records: agreedRecords(first, rest) }
}

function nameOf(reading: ResolverReading): string {
  return reading.resolver
}

function agreedRecords(first: AnsweredReading, rest: readonly AnsweredReading[]): HostRecords {
  const seen = new Map<string, number>()
  let agreed = first.records
  let majority = 0

  for (const reading of [first, ...rest]) {
    const key = signatureOf(reading.records)
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)

    if (count > majority) {
      majority = count
      agreed = reading.records
    }
  }

  return agreed
}

function signatureOf(records: HostRecords): string {
  return JSON.stringify([
    records.presence,
    [...records.txt].sort(),
    records.cname,
    [...records.otherTypes].sort(),
  ])
}
