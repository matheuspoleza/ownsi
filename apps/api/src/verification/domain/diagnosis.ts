import { unreachable } from "../../shared/result.ts"

export const CHALLENGE_LABEL = "_ownsi-challenge"

export const CHALLENGE_TOKEN_PREFIX = "ownsi_v1_"

export const DIAGNOSIS_CODES = [
  "domain_appended",
  "record_at_apex",
  "foreign_token",
  "expired_token",
  "value_formatted",
  "no_matching_record",
  "cname_conflict",
  "record_absent",
  "record_on_www",
  "not_published",
  "negative_cache",
  "servfail",
  "lame_delegation",
] as const

export type DiagnosisCode = (typeof DIAGNOSIS_CODES)[number]

export type AbsentAnswer =
  | { readonly type: "nxdomain" }
  | { readonly type: "nodata"; readonly types: readonly string[] }

export type Diagnosis =
  | { readonly code: "domain_appended"; readonly observed: { readonly name: string } }
  | {
      readonly code: "record_at_apex"
      readonly observed: { readonly name: string; readonly value: string }
    }
  | { readonly code: "foreign_token"; readonly observed: { readonly value: string } }
  | { readonly code: "expired_token"; readonly observed: { readonly value: string } }
  | { readonly code: "value_formatted"; readonly observed: { readonly value: string } }
  | {
      readonly code: "no_matching_record"
      readonly observed: { readonly values: readonly string[] }
    }
  | { readonly code: "cname_conflict"; readonly observed: { readonly target: string } }
  | { readonly code: "record_absent"; readonly observed: { readonly answer: AbsentAnswer } }
  | {
      readonly code: "record_on_www"
      readonly observed: { readonly name: string; readonly value: string }
    }
  | {
      readonly code: "not_published"
      readonly observed: { readonly nameservers: readonly string[] }
    }
  | { readonly code: "negative_cache"; readonly observed: { readonly secondsRemaining: number } }
  | { readonly code: "servfail"; readonly observed: { readonly resolvers: readonly string[] } }
  | {
      readonly code: "lame_delegation"
      readonly observed: { readonly nameservers: readonly string[] }
    }

export type Challenge = {
  readonly domain: string
  readonly token: string
}

export type Explanation = {
  readonly cause: string
  readonly fix: string
}

export function challengeHost(domain: string): string {
  return `${CHALLENGE_LABEL}.${domain}`
}

export function explain(diagnosis: Diagnosis, challenge: Challenge): Explanation {
  const { domain, token } = challenge
  const host = challengeHost(domain)

  switch (diagnosis.code) {
    case "domain_appended":
      return {
        cause: `Your panel appended the domain to what you typed, so the record landed on ${diagnosis.observed.name} instead of ${host}.`,
        fix: `Put only ${CHALLENGE_LABEL} in the Host field — the panel adds ${domain} for you.`,
      }
    case "record_at_apex":
      return {
        cause: `The token is on ${diagnosis.observed.name} itself, not on ${host}.`,
        fix: `Move the record to the ${CHALLENGE_LABEL} host and leave the records on ${domain} alone.`,
      }
    case "foreign_token":
      return {
        cause: `${host} already carries an ownsi token, and it is not the one issued for this claim.`,
        fix: `Replace its value with ${token}.`,
      }
    case "expired_token":
      return {
        cause: `${host} carries the token from an earlier claim of yours, and that claim has ended.`,
        fix: `Change its value to ${token}. The record is already in the right place, so this is one edit rather than a new record.`,
      }
    case "value_formatted":
      return {
        cause: `The value at ${host} is not exactly the token: your panel wrapped or padded what you pasted.`,
        fix: `Set it to exactly ${token}, with no quotes and no surrounding spaces.`,
      }
    case "no_matching_record":
      return {
        cause: `${host} carries ${plural(diagnosis.observed.values.length, "TXT record")}, and none of them holds your token.`,
        fix: `Add the token as one more TXT record on that host, or correct the one meant to carry it.`,
      }
    case "cname_conflict":
      return {
        cause: `${host} is a CNAME pointing at ${diagnosis.observed.target}, and a name that holds a CNAME can hold nothing else (RFC 1034).`,
        fix: `Remove the CNAME on ${CHALLENGE_LABEL}, then create the TXT record.`,
      }
    case "record_absent":
      return absent(diagnosis.observed.answer, host, token)
    case "record_on_www":
      return {
        cause: `The token is on ${diagnosis.observed.name}; the proof reads ${host}, without the www.`,
        fix: `Create the record on ${CHALLENGE_LABEL} at ${domain}, and remove the one under www.`,
      }
    case "not_published":
      return {
        cause: `${conjoin(diagnosis.observed.nameservers)} answer for ${domain} and do not have the record, so nothing is spreading yet.`,
        fix: `Reopen the record in your panel and confirm it saved — some panels hold zone changes in a draft until you publish them.`,
      }
    case "negative_cache":
      return {
        cause: `Your nameservers have the record; the public resolvers are still holding the "does not exist" they cached before you created it.`,
        fix: `Nothing to do — that memory expires in about ${formatDuration(diagnosis.observed.secondsRemaining)}, and ownsi rechecks on its own.`,
      }
    case "servfail":
      return {
        cause: `${conjoin(diagnosis.observed.resolvers)} answered SERVFAIL for ${host}, which means the zone fails to validate rather than that the record is missing.`,
        fix: `Check DNSSEC at your provider — while the signatures are broken, no record in ${domain} can be read.`,
      }
    case "lame_delegation":
      return {
        cause: `${domain} is delegated to ${conjoin(diagnosis.observed.nameservers)}, and none of them answered.`,
        fix: `This is a delegation problem at your provider, not a problem with the record — the nameservers ${domain} points at are not serving the zone.`,
      }
    default:
      return unreachable(diagnosis)
  }
}

function absent(answer: AbsentAnswer, host: string, token: string): Explanation {
  if (answer.type === "nxdomain") {
    return {
      cause: `Nothing exists at ${host} — the record was never created, or it was saved under a different name.`,
      fix: `Create a TXT record on ${CHALLENGE_LABEL} with the value ${token}.`,
    }
  }
  return {
    cause: `${host} exists but carries no TXT record; what is published there is ${conjoin(answer.types)}.`,
    fix: `Add a TXT record on that host — ${conjoin(answer.types)} cannot carry the token, only TXT can.`,
  }
}

const SECONDS_IN_MINUTE = 60
const SECONDS_IN_HOUR = 3_600

export function formatDuration(seconds: number): string {
  if (seconds < SECONDS_IN_MINUTE) return plural(Math.max(1, Math.round(seconds)), "second")
  if (seconds < SECONDS_IN_HOUR) return plural(Math.round(seconds / SECONDS_IN_MINUTE), "minute")
  return plural(Math.round(seconds / SECONDS_IN_HOUR), "hour")
}

function plural(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`
}

function conjoin(values: readonly string[]): string {
  if (values.length < 2) return values.join("")
  return `${values.slice(0, -1).join(", ")} and ${values.slice(-1).join("")}`
}
