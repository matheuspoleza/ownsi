import { CONSUMER_EMAIL_HOSTS, EMAIL, HOSTNAME, MAX_HOSTNAME_LENGTH } from "./domain.constants.ts"

export interface ClaimInput {
  /** The domain we would claim, or null while the input is not one yet. */
  domain: string | null
  /** Set when the person typed an address rather than a domain. */
  email: string | null
  /** True for an address at a mailbox provider — a domain we must not suggest. */
  consumerEmail: boolean
}

const stripScheme = (value: string) => value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
const stripPath = (value: string) => value.split(/[/?#]/, 1)[0] ?? ""
const stripUserInfo = (value: string) => value.slice(value.lastIndexOf("@") + 1)
const stripPort = (value: string) => value.replace(/:\d+$/, "")
const stripTrailingDot = (value: string) => value.replace(/\.+$/, "")
const stripWww = (value: string) => value.replace(/^www\./, "")

const toPunycode = (value: string) => {
  try {
    return new URL(`http://${value}`).hostname
  } catch {
    return null
  }
}

export const normalizeDomain = (raw: string): string | null => {
  const cleaned = [
    stripScheme,
    stripPath,
    stripUserInfo,
    stripPort,
    stripTrailingDot,
    stripWww,
  ].reduce((value, strip) => strip(value), raw.trim().toLowerCase())

  if (!cleaned) return null

  const hostname = toPunycode(cleaned)
  if (!hostname || hostname.length > MAX_HOSTNAME_LENGTH || !HOSTNAME.test(hostname)) return null
  return hostname
}

export const parseClaimInput = (raw: string): ClaimInput => {
  const value = raw.trim()
  const email = EMAIL.test(value) ? value.toLowerCase() : null
  const domain = normalizeDomain(value)
  const consumerEmail = email !== null && domain !== null && CONSUMER_EMAIL_HOSTS.has(domain)
  return { domain: consumerEmail ? null : domain, email, consumerEmail }
}
