import { t } from "elysia"
import type { ZoneStep } from "../application/read-zone.ts"

export type DelegatedStep = Extract<ZoneStep, { type: "delegated" }>
export type PublishedStep = Extract<ZoneStep, { type: "published" }>

const DomainShape = t.Object({
  ascii: t.String(),
  unicode: t.String(),
  normalisations: t.Array(t.String()),
  isPublicSuffix: t.Boolean(),
})

const ProviderShape = t.UnionEnum([
  "cloudflare",
  "route53",
  "godaddy",
  "namecheap",
  "google-domains",
  "vercel",
  "other",
])

export const ZoneDelegationStep = t.Object({
  step: t.Literal("delegation"),
  name: t.String(),
  domain: DomainShape,
  nameservers: t.Array(t.String()),
  provider: ProviderShape,
  observedAt: t.String(),
  cached: t.Boolean(),
})

export const ZonePublishingStep = t.Object({
  step: t.Literal("publishing"),
  publishingMinutes: t.Union([t.Number(), t.Null()]),
  negativeCacheTtlSeconds: t.Union([t.Number(), t.Null()]),
})

export const ZoneStepResponse = t.Union([
  t.Object({ event: t.Literal("delegation"), data: ZoneDelegationStep }),
  t.Object({ event: t.Literal("publishing"), data: ZonePublishingStep }),
])

export function toDelegationStep({ domain, zone, fromCache }: DelegatedStep) {
  return {
    step: "delegation" as const,
    name: zone.name,
    domain: {
      ascii: domain.ascii,
      unicode: domain.unicode,
      normalisations: [...domain.normalisations],
      isPublicSuffix: domain.isPublicSuffix,
    },
    nameservers: [...zone.nameservers],
    provider: zone.provider,
    observedAt: zone.observedAt.toISOString(),
    cached: fromCache,
  }
}

export function toPublishingStep({ publishing, negativeCacheTtlSeconds }: PublishedStep) {
  return {
    step: "publishing" as const,
    publishingMinutes: publishing.type === "known" ? publishing.minutes : null,
    negativeCacheTtlSeconds,
  }
}
