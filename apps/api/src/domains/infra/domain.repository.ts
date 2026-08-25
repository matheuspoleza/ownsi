import type { Database } from "../../shared/database.ts"
import type { Domain } from "../domain/domain.ts"
import type { DomainRepository } from "../domain/ports.ts"

export type DomainRow = {
  readonly id: string
  readonly userId: string
  readonly nameAscii: string
  readonly nameUnicode: string
  readonly archivedAt: Date | null
  readonly createdAt: Date
}

export function postgresDomainRepository(database: Database): DomainRepository {
  return {
    async findById(domainId) {
      const row = await database.domain.findUnique({ where: { id: domainId } })
      return row === null ? null : toDomain(row)
    },

    async findByName(userId, nameAscii) {
      const row = await database.domain.findUnique({
        where: { userId_nameAscii: { userId, nameAscii } },
      })
      return row === null ? null : toDomain(row)
    },

    async listByUser(userId) {
      const rows = await database.domain.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
      return rows.map(toDomain)
    },

    async save(domain) {
      await database.domain.upsert({
        where: { id: domain.id },
        create: { id: domain.id, ...columns(domain) },
        update: { archivedAt: domain.archivedAt },
      })
    },

    async remove(domainId) {
      await database.domain.delete({ where: { id: domainId } })
    },
  }
}

function columns(domain: Domain) {
  return {
    userId: domain.userId,
    nameAscii: domain.nameAscii,
    nameUnicode: domain.nameUnicode,
    archivedAt: domain.archivedAt,
    createdAt: domain.createdAt,
  }
}

export function toDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    userId: row.userId,
    nameAscii: row.nameAscii,
    nameUnicode: row.nameUnicode,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
  }
}
