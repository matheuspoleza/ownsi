import { Prisma } from "@ownsi/db"
import type { Database } from "../../shared/database.ts"
import type {
  AttemptOutcome,
  AttemptTrigger,
  ChallengeRequest,
  VerificationAttempt,
  VerificationMethodId,
} from "../domain/attempt.ts"
import { DIAGNOSIS_CODES, type Diagnosis } from "../domain/diagnosis.ts"
import type { VerificationRepository } from "../domain/ports.ts"
import type { LastRun, Verification, VerificationStatus } from "../domain/verification.ts"

type MethodRow = "DNS_TXT"
type StatusRow = "RUNNING" | "PROVED" | "EXHAUSTED" | "STOPPED"
type OutcomeRow = "FOUND" | "ABSENT" | "UNRESOLVABLE"
type TriggerRow = "FIRST_CHECK" | "SCHEDULED" | "REQUESTED"

export type VerificationRow = {
  readonly id: string
  readonly claimId: string
  readonly ownerId: string
  readonly method: MethodRow
  readonly challenge: unknown
  readonly status: StatusRow
  readonly deadline: Date
  readonly nextRunAt: Date | null
  readonly consecutiveFailures: number
  readonly lastOutcome: OutcomeRow | null
  readonly lastRunAt: Date | null
  readonly lastDiagnosis: unknown
  readonly createdAt: Date
}

export type AttemptRow = {
  readonly id: string
  readonly verificationId: string
  readonly trigger: TriggerRow
  readonly outcome: OutcomeRow
  readonly diagnosis: unknown
  readonly evidence: unknown
  readonly latencyMs: number | null
  readonly createdAt: Date
}

const METHOD_ROW: Record<VerificationMethodId, MethodRow> = { dns_txt: "DNS_TXT" }
const METHOD_ID: Record<MethodRow, VerificationMethodId> = { DNS_TXT: "dns_txt" }

const STATUS_ROW: Record<VerificationStatus, StatusRow> = {
  running: "RUNNING",
  proved: "PROVED",
  exhausted: "EXHAUSTED",
  stopped: "STOPPED",
}

const STATUS: Record<StatusRow, VerificationStatus> = {
  RUNNING: "running",
  PROVED: "proved",
  EXHAUSTED: "exhausted",
  STOPPED: "stopped",
}

const OUTCOME_ROW: Record<AttemptOutcome["type"], OutcomeRow> = {
  found: "FOUND",
  absent: "ABSENT",
  unresolvable: "UNRESOLVABLE",
}

const TRIGGER_ROW: Record<AttemptTrigger, TriggerRow> = {
  first_check: "FIRST_CHECK",
  scheduled: "SCHEDULED",
  requested: "REQUESTED",
}

const TRIGGER: Record<TriggerRow, AttemptTrigger> = {
  FIRST_CHECK: "first_check",
  SCHEDULED: "scheduled",
  REQUESTED: "requested",
}

export function postgresVerificationRepository(database: Database): VerificationRepository {
  return {
    async findById(verificationId) {
      const row = await database.verification.findUnique({ where: { id: verificationId } })
      return row === null ? null : toVerification(row as VerificationRow)
    },

    async save(verification) {
      await database.verification.upsert({
        where: { id: verification.id },
        create: { id: verification.id, ...verificationColumns(verification) },
        update: verificationColumns(verification),
      })
    },

    async saveRun(verification, attempt) {
      await database.$transaction([
        database.verification.update({
          where: { id: verification.id },
          data: verificationColumns(verification),
        }),
        database.verificationAttempt.create({
          data: { id: attempt.id, ...attemptColumns(attempt) },
        }),
      ])
    },

    async listAttempts(verificationId, limit) {
      const rows = await database.verificationAttempt.findMany({
        where: { verificationId },
        orderBy: { createdAt: "desc" },
        take: limit,
      })

      return rows.map((row) => toAttempt(row as AttemptRow))
    },
  }
}

export function verificationColumns(verification: Verification) {
  const { lastRun } = verification

  return {
    claimId: verification.subjectId,
    ownerId: verification.ownerId,
    method: METHOD_ROW[verification.method],
    challenge: asJson(verification.challenge),
    status: STATUS_ROW[verification.status],
    deadline: verification.deadline,
    nextRunAt: verification.nextRunAt,
    consecutiveFailures: verification.consecutiveFailures,
    lastOutcome: lastRun === null ? null : OUTCOME_ROW[lastRun.outcome],
    lastRunAt: lastRun?.at ?? null,
    lastDiagnosis: lastRun?.outcome === "absent" ? asJson(lastRun.diagnosis) : Prisma.DbNull,
    createdAt: verification.createdAt,
  }
}

export function attemptColumns(attempt: VerificationAttempt) {
  const { outcome } = attempt

  return {
    verificationId: attempt.verificationId,
    trigger: TRIGGER_ROW[attempt.trigger],
    outcome: OUTCOME_ROW[outcome.type],
    diagnosis: outcome.type === "absent" ? asJson(outcome.diagnosis) : Prisma.DbNull,
    evidence: asJson(evidenceOf(outcome)),
    latencyMs: attempt.latencyMs,
    createdAt: attempt.at,
  }
}

export function toVerification(row: VerificationRow): Verification {
  return {
    id: row.id,
    subjectId: row.claimId,
    ownerId: row.ownerId,
    method: METHOD_ID[row.method],
    challenge: toChallenge(row.challenge),
    status: STATUS[row.status],
    deadline: row.deadline,
    nextRunAt: row.nextRunAt,
    consecutiveFailures: row.consecutiveFailures,
    lastRun: toLastRun(row),
    createdAt: row.createdAt,
  }
}

export function toAttempt(row: AttemptRow): VerificationAttempt {
  return {
    id: row.id,
    verificationId: row.verificationId,
    trigger: TRIGGER[row.trigger],
    outcome: toOutcome(row),
    latencyMs: row.latencyMs,
    at: row.createdAt,
  }
}

function toOutcome(row: AttemptRow): AttemptOutcome {
  const evidence = row.evidence as { value?: string; resolvers?: readonly string[] } | null

  switch (row.outcome) {
    case "FOUND":
      return { type: "found", value: evidence?.value ?? "" }
    case "UNRESOLVABLE":
      return { type: "unresolvable", resolvers: evidence?.resolvers ?? [] }
    case "ABSENT": {
      const diagnosis = toDiagnosis(row.diagnosis)
      return diagnosis === null
        ? { type: "unresolvable", resolvers: [] }
        : { type: "absent", diagnosis }
    }
  }
}

function evidenceOf(outcome: AttemptOutcome) {
  switch (outcome.type) {
    case "found":
      return { value: outcome.value }
    case "unresolvable":
      return { resolvers: [...outcome.resolvers] }
    case "absent":
      return {}
  }
}

function toLastRun(row: VerificationRow): LastRun | null {
  const at = row.lastRunAt
  if (row.lastOutcome === null || at === null) return null

  switch (row.lastOutcome) {
    case "FOUND":
      return { outcome: "found", at }
    case "UNRESOLVABLE":
      return { outcome: "unresolvable", at }
    case "ABSENT": {
      const diagnosis = toDiagnosis(row.lastDiagnosis)
      return diagnosis === null
        ? { outcome: "unresolvable", at }
        : { outcome: "absent", diagnosis, at }
    }
  }
}

function toChallenge(value: unknown): ChallengeRequest {
  const held = value as Partial<ChallengeRequest> | null

  return {
    domain: held?.domain ?? "",
    token: held?.token ?? "",
    previousTokens: held?.previousTokens ?? [],
  }
}

function toDiagnosis(value: unknown): Diagnosis | null {
  if (typeof value !== "object" || value === null) return null

  const { code } = value as { code?: unknown }
  const named = typeof code === "string" && (DIAGNOSIS_CODES as readonly string[]).includes(code)

  return named ? (value as Diagnosis) : null
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}
