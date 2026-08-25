import { Prisma } from "@ownsi/db"
import type { Database } from "../../shared/database.ts"
import { DIAGNOSIS_CODES, type Diagnosis } from "../../verification/verification.contract.ts"
import { type AccountDomain, claimsOf } from "../domain/account-domain.ts"
import { type Claim, type ClaimFacts, daysAfter, isOpen, type LastCheck } from "../domain/claim.ts"
import {
  CLAIM_WINDOW_DAYS,
  type ClaimState,
  type EndedState,
  type WaitEstimate,
} from "../domain/claim-lifecycle.ts"
import type { AccountDomainRepository } from "../domain/ports.ts"

type StateRow = "PENDING" | "PROVED" | "EXPIRED" | "CANCELED"
type OutcomeRow = "FOUND" | "ABSENT" | "UNRESOLVABLE"
type ReasonRow = "FIRST_CHECK" | "NEGATIVE_CACHE" | "PROVIDER_PUBLISHING"

export type ClaimRow = {
  readonly id: string
  readonly domainId: string
  readonly userId: string
  readonly token: string
  readonly state: StateRow
  readonly expiresAt: Date
  readonly nextCheckAt: Date | null
  readonly consecutiveFailures: number
  readonly endedAt: Date | null
  readonly waitReason: ReasonRow | null
  readonly waitSecondsRemaining: number | null
  readonly lastCheckOutcome: OutcomeRow | null
  readonly lastCheckAt: Date | null
  readonly lastDiagnosis: unknown
  readonly createdAt: Date
}

type DomainRow = {
  readonly id: string
  readonly userId: string
  readonly nameAscii: string
  readonly nameUnicode: string
  readonly archivedAt: Date | null
  readonly createdAt: Date
  readonly claims: readonly ClaimRow[]
}

const STATE_ROW: Record<ClaimState, StateRow> = {
  pending: "PENDING",
  proved: "PROVED",
  expired: "EXPIRED",
  canceled: "CANCELED",
}

const ENDED_STATE: Record<Exclude<StateRow, "PENDING">, EndedState> = {
  PROVED: "proved",
  EXPIRED: "expired",
  CANCELED: "canceled",
}

const OUTCOME_ROW: Record<LastCheck["outcome"], OutcomeRow> = {
  found: "FOUND",
  absent: "ABSENT",
  unresolvable: "UNRESOLVABLE",
}

const REASON_ROW: Record<WaitEstimate["reason"], ReasonRow> = {
  first_check: "FIRST_CHECK",
  negative_cache: "NEGATIVE_CACHE",
  provider_publishing: "PROVIDER_PUBLISHING",
}

const WAIT_REASON: Record<ReasonRow, WaitEstimate["reason"]> = {
  FIRST_CHECK: "first_check",
  NEGATIVE_CACHE: "negative_cache",
  PROVIDER_PUBLISHING: "provider_publishing",
}

const newestFirst = { claims: { orderBy: { sequence: "desc" } } } as const

export function postgresDomainRepository(database: Database): AccountDomainRepository {
  return {
    async findById(userId, domainId) {
      const row = await database.domain.findUnique({
        where: { id: domainId },
        include: newestFirst,
      })

      return row?.userId === userId ? toAccountDomain(row) : null
    },

    async findByName(userId, nameAscii) {
      const row = await database.domain.findUnique({
        where: { userId_nameAscii: { userId, nameAscii } },
        include: newestFirst,
      })

      return row === null ? null : toAccountDomain(row)
    },

    async listByUser(userId) {
      const rows = await database.domain.findMany({
        where: { userId },
        include: newestFirst,
        orderBy: { createdAt: "desc" },
      })

      return rows.map(toAccountDomain)
    },

    async save(record) {
      const oldestFirst = [...claimsOf(record)].reverse()

      await database.$transaction([
        database.domain.upsert({
          where: { id: record.domain.id },
          create: {
            id: record.domain.id,
            userId: record.userId,
            nameAscii: record.domain.nameAscii,
            nameUnicode: record.domain.nameUnicode,
            archivedAt: record.archivedAt,
            createdAt: record.domain.createdAt,
          },
          update: { archivedAt: record.archivedAt },
        }),
        ...oldestFirst.map((claim) =>
          database.claim.upsert({
            where: { id: claim.id },
            create: { id: claim.id, domainId: record.domain.id, ...claimColumns(claim) },
            update: claimColumns(claim),
          }),
        ),
      ])
    },
  }
}

export function claimColumns(claim: Claim) {
  const check = claim.lastCheck

  return {
    userId: claim.userId,
    token: claim.token,
    state: STATE_ROW[claim.state],
    expiresAt: isOpen(claim) ? claim.expiresAt : daysAfter(claim.createdAt, CLAIM_WINDOW_DAYS),
    nextCheckAt: isOpen(claim) ? claim.nextCheckAt : null,
    consecutiveFailures: isOpen(claim) ? claim.consecutiveFailures : 0,
    endedAt: isOpen(claim) ? null : claim.endedAt,
    waitReason: isOpen(claim) && claim.waitEstimate ? REASON_ROW[claim.waitEstimate.reason] : null,
    waitSecondsRemaining: isOpen(claim) ? (claim.waitEstimate?.secondsRemaining ?? null) : null,
    lastCheckOutcome: check === null ? null : OUTCOME_ROW[check.outcome],
    lastCheckAt: check?.at ?? null,
    lastDiagnosis: check?.outcome === "absent" ? serialised(check.diagnosis) : Prisma.DbNull,
    createdAt: claim.createdAt,
  }
}

function serialised(diagnosis: Diagnosis): Prisma.InputJsonValue {
  return diagnosis as unknown as Prisma.InputJsonValue
}

function toAccountDomain(row: DomainRow): AccountDomain {
  const [current, ...history] = row.claims.map(toClaim)
  if (current === undefined) throw new Error(`domain ${row.id} has no claim`)

  return {
    userId: row.userId,
    domain: {
      id: row.id,
      nameAscii: row.nameAscii,
      nameUnicode: row.nameUnicode,
      createdAt: row.createdAt,
    },
    claim: current,
    history,
    archivedAt: row.archivedAt,
  }
}

export function toClaim(row: ClaimRow): Claim {
  const facts: ClaimFacts = {
    id: row.id,
    userId: row.userId,
    domainId: row.domainId,
    token: row.token,
    lastCheck: toLastCheck(row),
    createdAt: row.createdAt,
  }

  if (row.state === "PENDING") {
    return {
      ...facts,
      state: "pending",
      waitEstimate: toWaitEstimate(row),
      expiresAt: row.expiresAt,
      nextCheckAt: row.nextCheckAt ?? row.expiresAt,
      consecutiveFailures: row.consecutiveFailures,
    }
  }

  const endedAt = row.endedAt
  if (endedAt === null) throw new Error(`claim ${row.id} is ${row.state} with no end date`)

  return { ...facts, state: ENDED_STATE[row.state], endedAt }
}

function toWaitEstimate(row: ClaimRow): WaitEstimate | null {
  const seconds = row.waitSecondsRemaining
  if (row.waitReason === null || seconds === null) return null

  return { reason: WAIT_REASON[row.waitReason], secondsRemaining: seconds }
}

function toLastCheck(row: ClaimRow): LastCheck | null {
  const at = row.lastCheckAt
  if (row.lastCheckOutcome === null || at === null) return null

  switch (row.lastCheckOutcome) {
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

function toDiagnosis(value: unknown): Diagnosis | null {
  if (typeof value !== "object" || value === null) return null

  const { code } = value as { code?: unknown }
  const named = typeof code === "string" && (DIAGNOSIS_CODES as readonly string[]).includes(code)

  return named ? (value as Diagnosis) : null
}
