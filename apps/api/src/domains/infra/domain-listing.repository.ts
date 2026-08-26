import type { Prisma } from "@ownsi/db"
import type { Database } from "../../shared/database.ts"
import type { Domain } from "../domain/domain.ts"
import type { DomainListing, DomainStatus, ListedDomain } from "../domain/ports.ts"

type ClaimStateColumn = "PENDING" | "PROVED" | "EXPIRED" | "CANCELED"

type ClaimRow = {
  readonly id: string
  readonly state: ClaimStateColumn
  readonly verificationId: string | null
  readonly createdAt: Date
  readonly endedAt: Date | null
}

const CLAIMED_STATUSES = ["pending", "proved", "expired", "canceled"] as const

type ClaimedStatus = (typeof CLAIMED_STATUSES)[number]

const COLUMN_OF: Record<ClaimedStatus, ClaimStateColumn> = {
  pending: "PENDING",
  proved: "PROVED",
  expired: "EXPIRED",
  canceled: "CANCELED",
}

const CLAIM_IN_PLAY = {
  select: { id: true, state: true, verificationId: true, createdAt: true, endedAt: true },
  orderBy: { sequence: "desc" },
} as const

export function postgresDomainListing(database: Database): DomainListing {
  return {
    async listPage({ userId, name, status, archived, after, limit }) {
      const rows = await database.domain.findMany({
        where: {
          userId,
          ...(name === null ? shelf(archived) : { nameAscii: name }),
          ...standing(status),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        ...(after === null ? {} : { cursor: { id: after }, skip: 1 }),
        include: { claims: CLAIM_IN_PLAY },
      })

      return rows.map((row) => toListedDomain(row, row.claims))
    },

    async countByStatus(userId) {
      const owned = (where: Prisma.DomainWhereInput) =>
        database.domain.count({ where: { userId, ...shelf(false), ...where } })

      const [unclaimed, pending, proved, expired, canceled, archived] = await database.$transaction(
        [
          owned(standing("unclaimed")),
          owned(standing("pending")),
          owned(standing("proved")),
          owned(standing("expired")),
          owned(standing("canceled")),
          database.domain.count({ where: { userId, ...shelf(true) } }),
        ],
      )

      return { unclaimed, pending, proved, expired, canceled, archived }
    },
  }
}

function shelf(archived: boolean): Prisma.DomainWhereInput {
  return { archivedAt: archived ? { not: null } : null }
}

function standing(status: DomainStatus | null): Prisma.DomainWhereInput {
  if (status === null) return {}
  if (status === "unclaimed") return { claims: { none: {} } }

  const outranking = CLAIMED_STATUSES.slice(0, CLAIMED_STATUSES.indexOf(status))

  return {
    claims: { some: { state: COLUMN_OF[status] } },
    AND: outranking.map((higher) => ({ claims: { none: { state: COLUMN_OF[higher] } } })),
  }
}

function toListedDomain(domain: Domain, claims: readonly ClaimRow[]): ListedDomain {
  const carrying = CLAIMED_STATUSES.map(
    (status) => [status, claims.find((claim) => claim.state === COLUMN_OF[status])] as const,
  ).find(([, claim]) => claim !== undefined)

  const claim = carrying?.[1] ?? null

  return {
    domain,
    status: carrying?.[0] ?? "unclaimed",
    claimId: claim?.id ?? null,
    verificationId: claim?.verificationId ?? null,
    claimStartedAt: claim?.createdAt ?? null,
    claimEndedAt: claim?.endedAt ?? null,
  }
}
