import { normalizeHostname } from "./hostname.ts"

export const PROVIDER_IDS = [
  "cloudflare",
  "route53",
  "godaddy",
  "namecheap",
  "google-domains",
  "vercel",
  "other",
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

type ProviderPattern = readonly [RegExp, ProviderId]

const PATTERNS: readonly ProviderPattern[] = [
  [/(^|\.)ns\.cloudflare\.com$/, "cloudflare"],
  [/(^|\.)cloudflare\.com$/, "cloudflare"],
  [/(^|\.)awsdns-\d+\.(com|net|org|co\.uk)$/, "route53"],
  [/(^|\.)domaincontrol\.com$/, "godaddy"],
  [/(^|\.)godaddy\.com$/, "godaddy"],
  [/(^|\.)registrar-servers\.com$/, "namecheap"],
  [/(^|\.)namecheaphosting\.com$/, "namecheap"],
  [/(^|\.)namecheap\.com$/, "namecheap"],
  [/(^|\.)googledomains\.com$/, "google-domains"],
  [/(^|\.)vercel-dns\.(com|net)$/, "vercel"],
]

export function detectProvider(nameservers: readonly string[]): ProviderId {
  if (nameservers.length === 0) return "other"

  const votes = new Map<ProviderId, number>()
  for (const nameserver of nameservers) {
    const provider = identify(nameserver)
    votes.set(provider, (votes.get(provider) ?? 0) + 1)
  }

  for (const [provider, count] of votes) {
    if (provider !== "other" && count * 2 > nameservers.length) return provider
  }
  return "other"
}

function identify(nameserver: string): ProviderId {
  const host = normalizeHostname(nameserver)
  return PATTERNS.find(([pattern]) => pattern.test(host))?.[1] ?? "other"
}
