import type { Database } from "../../shared/database.ts"
import { maskEmail } from "../../shared/masked-email.ts"
import type {
  Claimant,
  FindCoexistence,
  FindLatestProof,
  FindOtherClaimants,
} from "../domain/ports.ts"

const PROVED_NEWEST_FIRST = {
  state: "PROVED",
  orderBy: { endedAt: "desc" },
  include: { domain: { include: { user: { select: { email: true } } } } },
} as const

export function postgresCoexistence(database: Database): FindCoexistence {
  return async (nameAscii, exceptUserId) => {
    const proved = await database.claim.findFirst({
      where: {
        state: PROVED_NEWEST_FIRST.state,
        domain: { nameAscii, userId: { not: exceptUserId } },
      },
      orderBy: PROVED_NEWEST_FIRST.orderBy,
      include: PROVED_NEWEST_FIRST.include,
    })

    if (!proved?.endedAt) return null

    return {
      maskedEmail: maskEmail(proved.domain.user.email),
      provedAt: proved.endedAt.toISOString(),
    }
  }
}

export function postgresLatestProof(database: Database): FindLatestProof {
  return async (nameAscii) => {
    const proved = await database.claim.findFirst({
      where: { state: PROVED_NEWEST_FIRST.state, domain: { nameAscii } },
      orderBy: PROVED_NEWEST_FIRST.orderBy,
      include: PROVED_NEWEST_FIRST.include,
    })

    if (!proved?.endedAt) return null

    return { maskedEmail: maskEmail(proved.domain.user.email), provedAt: proved.endedAt }
  }
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
