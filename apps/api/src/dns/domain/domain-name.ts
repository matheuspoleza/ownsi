import { getDomain, getPublicSuffix } from "tldts"
import { err, ok, type Result } from "../../shared/result.ts"

export type Normalisation =
  | "lowercased"
  | "scheme_removed"
  | "path_removed"
  | "userinfo_removed"
  | "port_removed"
  | "trailing_dot_removed"
  | "www_removed"
  | "punycode_encoded"

export type DomainNameError = "empty" | "not_a_hostname" | "too_long"

export type DomainName = {
  readonly ascii: string
  readonly unicode: string
  readonly registrable: string | null
  readonly publicSuffix: string | null
  readonly isPublicSuffix: boolean
  readonly normalisations: readonly Normalisation[]
}

const MAX_LENGTH = 253
const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
const TOP_LEVEL = "(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})"
const HOSTNAME = new RegExp(`^(?:${LABEL}\\.)+${TOP_LEVEL}$`)
const PSL_OPTIONS = { allowPrivateDomains: true } as const

export function parseDomainName(raw: string): Result<DomainName, DomainNameError> {
  const applied: Normalisation[] = []
  let value = raw.trim()
  if (!value) return err("empty")

  const lowered = value.toLowerCase()
  if (lowered !== value) applied.push("lowercased")
  value = lowered

  value = strip(value, /^[a-z][a-z0-9+.-]*:\/\//, applied, "scheme_removed")
  value = stripFrom(value, /[/?#]/, applied, "path_removed")
  value = stripUserInfo(value, applied)
  value = strip(value, /:\d+$/, applied, "port_removed")
  value = strip(value, /\.+$/, applied, "trailing_dot_removed")
  value = strip(value, /^www\./, applied, "www_removed")
  if (!value) return err("empty")

  const unicode = value
  const ascii = toPunycode(value)
  if (ascii === null) return err("not_a_hostname")
  if (ascii !== unicode) applied.push("punycode_encoded")

  if (ascii.length > MAX_LENGTH) return err("too_long")
  if (!HOSTNAME.test(ascii)) return err("not_a_hostname")

  const publicSuffix = getPublicSuffix(ascii, PSL_OPTIONS)

  return ok({
    ascii,
    unicode,
    registrable: getDomain(ascii, PSL_OPTIONS),
    publicSuffix,
    isPublicSuffix: publicSuffix !== null && publicSuffix === ascii,
    normalisations: applied,
  })
}

export function zoneCandidates(domain: DomainName): readonly string[] {
  const apex = domain.registrable ?? domain.ascii
  const labels = domain.ascii.split(".")
  const apexLabelCount = apex.split(".").length

  const candidates: string[] = []
  for (let offset = 0; labels.length - offset >= apexLabelCount; offset++) {
    candidates.push(labels.slice(offset).join("."))
  }
  return candidates
}

export function childHost(domain: DomainName, prefix: string): string {
  return `${prefix}.${domain.ascii}`
}

function strip(
  value: string,
  pattern: RegExp,
  applied: Normalisation[],
  normalisation: Normalisation,
): string {
  const next = value.replace(pattern, "")
  if (next !== value) applied.push(normalisation)
  return next
}

function stripFrom(
  value: string,
  separator: RegExp,
  applied: Normalisation[],
  normalisation: Normalisation,
): string {
  const next = value.split(separator, 1)[0] ?? ""
  if (next !== value) applied.push(normalisation)
  return next
}

function stripUserInfo(value: string, applied: Normalisation[]): string {
  const separator = value.lastIndexOf("@")
  if (separator === -1) return value
  applied.push("userinfo_removed")
  return value.slice(separator + 1)
}

function toPunycode(value: string): string | null {
  try {
    return new URL(`http://${value}`).hostname
  } catch {
    return null
  }
}
