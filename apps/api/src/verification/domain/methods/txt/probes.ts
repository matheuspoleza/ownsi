import { CHALLENGE_TOKEN_PREFIX, type Diagnosis } from "../../diagnosis.ts"
import type { HostRecords, TxtChallenge, TxtObservation } from "./observation.ts"

export type Probe = (observation: TxtObservation, challenge: TxtChallenge) => Diagnosis | null

function atChallengeHost(observation: TxtObservation): HostRecords | null {
  return observation.challenge.type === "agreed" ? observation.challenge.records : null
}

function unquote(value: string): string {
  return value
    .trim()
    .replace(/^"(.*)"$/s, "$1")
    .trim()
}

function holdsToken(records: HostRecords | null, token: string): boolean {
  return records?.txt.includes(token) ?? false
}

const cnameConflict: Probe = (observation) => {
  const target = atChallengeHost(observation)?.cname
  return target ? { code: "cname_conflict", observed: { target } } : null
}

const valueFormatted: Probe = (observation, { token }) => {
  const value = atChallengeHost(observation)?.txt.find(
    (candidate) => candidate !== token && unquote(candidate) === token,
  )
  return value === undefined ? null : { code: "value_formatted", observed: { value } }
}

const expiredToken: Probe = (observation, { previousTokens }) => {
  const value = atChallengeHost(observation)?.txt.find((candidate) =>
    previousTokens.includes(candidate),
  )
  return value === undefined ? null : { code: "expired_token", observed: { value } }
}

const foreignToken: Probe = (observation, { token, previousTokens }) => {
  const value = atChallengeHost(observation)?.txt.find(
    (candidate) =>
      candidate.startsWith(CHALLENGE_TOKEN_PREFIX) &&
      candidate !== token &&
      !previousTokens.includes(candidate),
  )
  return value === undefined ? null : { code: "foreign_token", observed: { value } }
}

const domainAppended: Probe = (observation, { token }) =>
  holdsToken(observation.appended, token) && observation.appended
    ? { code: "domain_appended", observed: { name: observation.appended.name } }
    : null

const recordAtApex: Probe = (observation, { token }) =>
  holdsToken(observation.apex, token) && observation.apex
    ? { code: "record_at_apex", observed: { name: observation.apex.name, value: token } }
    : null

const recordOnWww: Probe = (observation, { token }) =>
  holdsToken(observation.www, token) && observation.www
    ? { code: "record_on_www", observed: { name: observation.www.name, value: token } }
    : null

const noMatchingRecord: Probe = (observation) => {
  const values = atChallengeHost(observation)?.txt ?? []
  return values.length === 0 ? null : { code: "no_matching_record", observed: { values } }
}

const negativeCache: Probe = (observation) => {
  const authority = observation.authoritative
  return authority.type === "holds"
    ? {
        code: "negative_cache",
        observed: { secondsRemaining: authority.negativeCacheTtlSeconds },
      }
    : null
}

const notPublished: Probe = (observation) => {
  const authority = observation.authoritative
  return authority.type === "lacks"
    ? { code: "not_published", observed: { nameservers: authority.nameservers } }
    : null
}

const lameDelegation: Probe = (observation) => {
  const authority = observation.authoritative
  return authority.type === "silent"
    ? { code: "lame_delegation", observed: { nameservers: authority.nameservers } }
    : null
}

export function whenNothingElseExplainsIt(observation: TxtObservation): Diagnosis {
  const records = atChallengeHost(observation)
  if (records?.presence === "nodata") {
    return {
      code: "record_absent",
      observed: { answer: { type: "nodata", types: records.otherTypes } },
    }
  }
  return { code: "record_absent", observed: { answer: { type: "nxdomain" } } }
}

export const PROBES: readonly Probe[] = [
  cnameConflict,
  valueFormatted,
  expiredToken,
  foreignToken,
  domainAppended,
  recordAtApex,
  recordOnWww,
  noMatchingRecord,
  negativeCache,
  notPublished,
  lameDelegation,
]
