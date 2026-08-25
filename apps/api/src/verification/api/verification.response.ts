import { type Static, type TSchema, t } from "elysia"
import { unreachable } from "../../shared/result.ts"
import type { VerificationAttempt } from "../domain/attempt.ts"
import { type Challenge, type Diagnosis, explain } from "../domain/diagnosis.ts"
import { runningState, type Verification, waitEstimate } from "../domain/verification.ts"

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
  reason: t.UnionEnum(["first_check", "negative_cache"]),
  secondsRemaining: t.Number(),
})

const Outcome = t.UnionEnum(["found", "absent", "unresolvable"])

export const VerificationResponse = t.Object({
  id: t.String(),
  claimId: t.String(),
  method: t.Literal("dns_txt"),
  status: t.UnionEnum([
    "checking",
    "propagating",
    "needs_attention",
    "proved",
    "exhausted",
    "stopped",
  ]),
  lastOutcome: t.Union([Outcome, t.Null()]),
  diagnosis: t.Union([DiagnosisResponse, t.Null()]),
  waitEstimate: t.Union([WaitEstimateResponse, t.Null()]),
  lastRunAt: t.Union([t.String(), t.Null()]),
  nextRunAt: t.Union([t.String(), t.Null()]),
  deadline: t.String(),
  createdAt: t.String(),
})

export const AttemptResponse = t.Object({
  id: t.String(),
  trigger: t.UnionEnum(["first_check", "scheduled", "requested"]),
  outcome: Outcome,
  diagnosis: t.Union([DiagnosisResponse, t.Null()]),
  latencyMs: t.Union([t.Number(), t.Null()]),
  at: t.String(),
})

export const AttemptListResponse = t.Object({ attempts: t.Array(AttemptResponse) })

const instant = (value: Date | null) => (value === null ? null : value.toISOString())

export function toVerificationResponse(
  verification: Verification,
  now: Date,
): Static<typeof VerificationResponse> {
  const { lastRun, challenge } = verification
  const diagnosis = lastRun?.outcome === "absent" ? lastRun.diagnosis : null

  return {
    id: verification.id,
    claimId: verification.subjectId,
    method: verification.method,
    status: verification.status === "running" ? runningState(verification) : verification.status,
    lastOutcome: lastRun?.outcome ?? null,
    diagnosis: diagnosis === null ? null : toDiagnosisResponse(diagnosis, challenge),
    waitEstimate: waitEstimate(verification, now),
    lastRunAt: instant(lastRun?.at ?? null),
    nextRunAt: instant(verification.nextRunAt),
    deadline: verification.deadline.toISOString(),
    createdAt: verification.createdAt.toISOString(),
  }
}

export function toAttemptListResponse(
  attempts: readonly VerificationAttempt[],
  challenge: Challenge,
): Static<typeof AttemptListResponse> {
  return { attempts: attempts.map((attempt) => toAttemptResponse(attempt, challenge)) }
}

function toAttemptResponse(
  attempt: VerificationAttempt,
  challenge: Challenge,
): Static<typeof AttemptResponse> {
  const { outcome } = attempt

  return {
    id: attempt.id,
    trigger: attempt.trigger,
    outcome: outcome.type,
    diagnosis: outcome.type === "absent" ? toDiagnosisResponse(outcome.diagnosis, challenge) : null,
    latencyMs: attempt.latencyMs,
    at: attempt.at.toISOString(),
  }
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
