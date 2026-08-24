import { type Static, type TSchema, t } from "elysia"
import { type Challenge, type Diagnosis, explain } from "../../shared/diagnosis.ts"
import { unreachable } from "../../shared/result.ts"
import { type Claim, challengeRecord } from "../domain/claim.ts"

const diagnosisOf = <Code extends Diagnosis["code"], Observed extends TSchema>(
  code: Code,
  observed: Observed,
) => t.Object({ code: t.Literal(code), cause: t.String(), fix: t.String(), observed })

const AbsentAnswer = t.Union([
  t.Object({ type: t.Literal("nxdomain") }),
  t.Object({ type: t.Literal("nodata"), types: t.Array(t.String()) }),
])

export const DiagnosisResponse = t.Union([
  diagnosisOf("domain_appended", t.Object({ name: t.String() })),
  diagnosisOf("record_at_apex", t.Object({ name: t.String(), value: t.String() })),
  diagnosisOf("foreign_token", t.Object({ value: t.String() })),
  diagnosisOf("value_formatted", t.Object({ value: t.String() })),
  diagnosisOf("no_matching_record", t.Object({ values: t.Array(t.String()) })),
  diagnosisOf("cname_conflict", t.Object({ target: t.String() })),
  diagnosisOf("record_absent", t.Object({ answer: AbsentAnswer })),
  diagnosisOf("record_on_www", t.Object({ name: t.String(), value: t.String() })),
  diagnosisOf("not_published", t.Object({ nameservers: t.Array(t.String()) })),
  diagnosisOf("negative_cache", t.Object({ secondsRemaining: t.Number() })),
  diagnosisOf("servfail", t.Object({ resolvers: t.Array(t.String()) })),
  diagnosisOf("lame_delegation", t.Object({ nameservers: t.Array(t.String()) })),
])

const WaitEstimateResponse = t.Object({
  reason: t.UnionEnum(["first_check", "negative_cache", "provider_publishing"]),
  secondsRemaining: t.Number(),
})

export const ClaimResponse = t.Object({
  id: t.String(),
  domain: t.String(),
  status: t.UnionEnum([
    "pending",
    "propagating",
    "needs_attention",
    "paused",
    "proved",
    "archived",
  ]),
  record: t.Object({
    host: t.String(),
    name: t.String(),
    type: t.Literal("TXT"),
    value: t.String(),
  }),
  lastOutcome: t.Union([t.UnionEnum(["found", "absent", "unresolvable"]), t.Null()]),
  diagnosis: t.Union([DiagnosisResponse, t.Null()]),
  waitEstimate: t.Union([WaitEstimateResponse, t.Null()]),
  firstVerifiedAt: t.Union([t.String(), t.Null()]),
  lastConfirmedAt: t.Union([t.String(), t.Null()]),
  coexistence: t.Union([t.Object({ maskedEmail: t.String(), provedAt: t.String() }), t.Null()]),
  createdAt: t.String(),
})

export const ClaimListResponse = t.Object({ claims: t.Array(ClaimResponse) })

const instant = (value: Date | null) => (value === null ? null : value.toISOString())

export function toClaimResponse(claim: Claim): Static<typeof ClaimResponse> {
  const challenge: Challenge = { domain: claim.domain, token: claim.token }

  return {
    id: claim.id,
    domain: claim.domain,
    status: claim.status,
    record: challengeRecord(claim),
    lastOutcome: claim.lastOutcome,
    diagnosis: claim.diagnosis === null ? null : toDiagnosisResponse(claim.diagnosis, challenge),
    waitEstimate: claim.waitEstimate,
    firstVerifiedAt: instant(claim.firstVerifiedAt),
    lastConfirmedAt: instant(claim.lastConfirmedAt),
    coexistence: claim.coexistence,
    createdAt: claim.createdAt.toISOString(),
  }
}

export function toClaimListResponse(claims: readonly Claim[]): Static<typeof ClaimListResponse> {
  return { claims: claims.map(toClaimResponse) }
}

export function toDiagnosisResponse(
  diagnosis: Diagnosis,
  challenge: Challenge,
): Static<typeof DiagnosisResponse> {
  const explanation = explain(diagnosis, challenge)
  const { code, observed } = diagnosis

  switch (code) {
    case "domain_appended":
      return { code, ...explanation, observed }
    case "record_at_apex":
      return { code, ...explanation, observed }
    case "foreign_token":
      return { code, ...explanation, observed }
    case "value_formatted":
      return { code, ...explanation, observed }
    case "cname_conflict":
      return { code, ...explanation, observed }
    case "record_on_www":
      return { code, ...explanation, observed }
    case "negative_cache":
      return { code, ...explanation, observed }
    case "no_matching_record":
      return { code, ...explanation, observed: { values: [...observed.values] } }
    case "servfail":
      return { code, ...explanation, observed: { resolvers: [...observed.resolvers] } }
    case "not_published":
      return { code, ...explanation, observed: { nameservers: [...observed.nameservers] } }
    case "lame_delegation":
      return { code, ...explanation, observed: { nameservers: [...observed.nameservers] } }
    case "record_absent":
      return {
        code,
        ...explanation,
        observed: {
          answer:
            observed.answer.type === "nxdomain"
              ? observed.answer
              : { type: "nodata", types: [...observed.answer.types] },
        },
      }
    default:
      return unreachable(code)
  }
}
