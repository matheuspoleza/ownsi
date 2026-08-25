import type { Database } from "../../shared/database.ts"
import type { Claim, ClaimState, EndedState, OpenClaim } from "../domain/claim.ts"
import type { ClaimRepository } from "../domain/ports.ts"

type StateRow = "PENDING" | "PROVED" | "EXPIRED" | "CANCELED"

export type ClaimRow = {
  readonly id: string
  readonly domainId: string
  readonly userId: string
  readonly token: string
  readonly state: StateRow
  readonly expiresAt: Date
  readonly endedAt: Date | null
  readonly verificationId: string | null
  readonly createdAt: Date
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

const newestFirst = { sequence: "desc" } as const

export function postgresClaimRepository(database: Database): ClaimRepository {
  return {
    async findById(claimId) {
      const row = await database.claim.findUnique({ where: { id: claimId } })
      return row === null ? null : toClaim(row as ClaimRow)
    },

    async findOpenByDomain(domainId) {
      const row = await database.claim.findFirst({
        where: { domainId, state: "PENDING" },
        orderBy: newestFirst,
      })
      if (row === null) return null

      const claim = toClaim(row as ClaimRow)
      return claim.state === "pending" ? claim : null
    },

    async listByUser(userId) {
      const rows = await database.claim.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
      return rows.map((row) => toClaim(row as ClaimRow))
    },

    async listByDomain(domainId) {
      const rows = await database.claim.findMany({ where: { domainId }, orderBy: newestFirst })
      return rows.map((row) => toClaim(row as ClaimRow))
    },

    async save(claim) {
      await database.claim.upsert({
        where: { id: claim.id },
        create: { id: claim.id, domainId: claim.domainId, ...claimColumns(claim) },
        update: claimColumns(claim),
      })
    },
  }
}

export function claimColumns(claim: Claim) {
  return {
    userId: claim.userId,
    token: claim.token,
    state: STATE_ROW[claim.state],
    expiresAt: claim.expiresAt,
    endedAt: claim.state === "pending" ? null : claim.endedAt,
    verificationId: claim.verificationId,
    createdAt: claim.createdAt,
  }
}

export function toClaim(row: ClaimRow): Claim {
  const facts = {
    id: row.id,
    userId: row.userId,
    domainId: row.domainId,
    token: row.token,
    verificationId: row.verificationId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }

  if (row.state === "PENDING") return { ...facts, state: "pending" } satisfies OpenClaim

  return { ...facts, state: ENDED_STATE[row.state], endedAt: row.endedAt ?? row.expiresAt }
}
