import { type Static, type TSchema, t } from "elysia"
import { unreachable } from "../../shared/result.ts"
import {
  type Challenge,
  type Diagnosis,
  explain,
} from "../../verification/verification.contract.ts"
import type { DomainView } from "../application/domain-view.ts"
import { firstVerifiedAt, lastConfirmedAt } from "../domain/account-domain.ts"
import { type Claim, challengeRecords, isOpen, pendingStatus } from "../domain/claim.ts"
import type { Domain } from "../domain/domain.ts"

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
  diagnosisOf("expired_token", t.Object({ value: t.String() })),
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

const ChallengeRecordResponse = t.Object({
  host: t.String(),
  name: t.String(),
  type: t.Literal("TXT"),
  value: t.String(),
})

const LastOutcome = t.Union([t.UnionEnum(["found", "absent", "unresolvable"]), t.Null()])

const OpenClaimResponse = t.Object({
  id: t.String(),
  status: t.UnionEnum(["pending", "propagating", "needs_attention"]),
  token: t.String(),
  records: t.Array(ChallengeRecordResponse),
  lastOutcome: LastOutcome,
  diagnosis: t.Union([DiagnosisResponse, t.Null()]),
  waitEstimate: t.Union([WaitEstimateResponse, t.Null()]),
  nextCheckAt: t.String(),
  expiresAt: t.String(),
  createdAt: t.String(),
})

const EndedClaimResponse = t.Object({
  id: t.String(),
  status: t.UnionEnum(["proved", "expired", "canceled"]),
  token: t.String(),
  lastOutcome: LastOutcome,
  diagnosis: t.Union([DiagnosisResponse, t.Null()]),
  endedAt: t.String(),
  createdAt: t.String(),
})

export const ClaimResponse = t.Union([OpenClaimResponse, EndedClaimResponse])

export const DomainResponse = t.Object({
  id: t.String(),
  name: t.String(),
  unicodeName: t.String(),
  archived: t.Boolean(),
  claim: ClaimResponse,
  history: t.Array(ClaimResponse),
  firstVerifiedAt: t.Union([t.String(), t.Null()]),
  lastConfirmedAt: t.Union([t.String(), t.Null()]),
  coexistence: t.Union([t.Object({ maskedEmail: t.String(), provedAt: t.String() }), t.Null()]),
  createdAt: t.String(),
})

export const DomainListResponse = t.Object({ domains: t.Array(DomainResponse) })

const instant = (value: Date | null) => (value === null ? null : value.toISOString())

export function toDomainResponse({
  record,
  coexistence,
}: DomainView): Static<typeof DomainResponse> {
  const { domain } = record

  return {
    id: domain.id,
    name: domain.nameAscii,
    unicodeName: domain.nameUnicode,
    archived: record.archivedAt !== null,
    claim: toClaimResponse(record.claim, domain),
    history: record.history.map((claim) => toClaimResponse(claim, domain)),
    firstVerifiedAt: instant(firstVerifiedAt(record)),
    lastConfirmedAt: instant(lastConfirmedAt(record)),
    coexistence,
    createdAt: domain.createdAt.toISOString(),
  }
}

export function toDomainListResponse(
  views: readonly DomainView[],
): Static<typeof DomainListResponse> {
  return { domains: views.map(toDomainResponse) }
}

export function toClaimResponse(claim: Claim, domain: Domain): Static<typeof ClaimResponse> {
  const challenge: Challenge = { domain: domain.nameAscii, token: claim.token }
  const diagnosis = claim.lastCheck?.outcome === "absent" ? claim.lastCheck.diagnosis : null

  const shared = {
    id: claim.id,
    token: claim.token,
    lastOutcome: claim.lastCheck?.outcome ?? null,
    diagnosis: diagnosis === null ? null : toDiagnosisResponse(diagnosis, challenge),
    createdAt: claim.createdAt.toISOString(),
  }

  if (isOpen(claim)) {
    return {
      ...shared,
      status: pendingStatus(claim),
      records: [...challengeRecords(claim, domain)],
      waitEstimate: claim.waitEstimate,
      nextCheckAt: claim.nextCheckAt.toISOString(),
      expiresAt: claim.expiresAt.toISOString(),
    }
  }

  return { ...shared, status: claim.state, endedAt: claim.endedAt.toISOString() }
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
    case "expired_token":
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
