import { t } from "elysia"
import type { ZoneReading } from "../application/read-zone.ts"

export const ZoneResponse = t.Object({
  name: t.String(),
  domain: t.Object({
    ascii: t.String(),
    unicode: t.String(),
    normalisations: t.Array(t.String()),
    isPublicSuffix: t.Boolean(),
  }),
  nameservers: t.Array(t.String()),
  provider: t.UnionEnum([
    "cloudflare",
    "route53",
    "godaddy",
    "namecheap",
    "google-domains",
    "vercel",
    "other",
  ]),
  publishingMinutes: t.Union([t.Number(), t.Null()]),
  negativeCacheTtlSeconds: t.Union([t.Number(), t.Null()]),
  observedAt: t.String(),
  cached: t.Boolean(),
})

export function toZoneResponse({ domain, zone, publishing, fromCache }: ZoneReading) {
  return {
    name: zone.name,
    domain: {
      ascii: domain.ascii,
      unicode: domain.unicode,
      normalisations: [...domain.normalisations],
      isPublicSuffix: domain.isPublicSuffix,
    },
    nameservers: [...zone.nameservers],
    provider: zone.provider,
    publishingMinutes: publishing.type === "known" ? publishing.minutes : null,
    negativeCacheTtlSeconds: zone.soa?.negativeCacheTtlSeconds ?? null,
    observedAt: zone.observedAt.toISOString(),
    cached: fromCache,
  }
}
