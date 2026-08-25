import type { Database } from "../../shared/database.ts"
import type { Claimant, FindCoexistence, FindOtherClaimants } from "../domain/ports.ts"

export function postgresCoexistence(database: Database): FindCoexistence {
  return async (domain, userId) => {
    const other = await database.domain.findFirst({
      where: {
        nameAscii: domain.nameAscii,
        userId: { not: userId },
        claims: { some: { state: "PROVED" } },
      },
      include: {
        user: { select: { email: true } },
        claims: { where: { state: "PROVED" }, orderBy: { endedAt: "asc" }, take: 1 },
      },
    })

    const provedAt = other?.claims[0]?.endedAt
    if (!other || !provedAt) return null

    return { maskedEmail: mask(other.user.email), provedAt: provedAt.toISOString() }
  }
}

function mask(email: string): string {
  const [local = "", host = ""] = email.split("@")

  return `${local.slice(0, 1)}•••@${host}`
}

export function postgresOtherClaimants(database: Database): FindOtherClaimants {
  return async (nameAscii, exceptUserId) => {
    const rows = await database.domain.findMany({
      where: {
        nameAscii,
        userId: { not: exceptUserId },
        claims: { some: { state: "PENDING" } },
      },
      include: { claims: { where: { state: "PENDING" }, orderBy: { sequence: "desc" }, take: 1 } },
    })

    return rows.flatMap((row): Claimant[] => {
      const claim = row.claims[0]
      if (!claim) return []

      return [{ userId: row.userId, domainId: row.id, claimId: claim.id, token: claim.token }]
    })
  }
}
