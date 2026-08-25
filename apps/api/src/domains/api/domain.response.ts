import { type Static, t } from "elysia"
import type { Domain } from "../domain/domain.ts"

export const DomainResponse = t.Object({
  id: t.String(),
  name: t.String(),
  unicodeName: t.String(),
  archived: t.Boolean(),
  createdAt: t.String(),
})

export const DomainListResponse = t.Object({ domains: t.Array(DomainResponse) })

export function toDomainResponse(domain: Domain): Static<typeof DomainResponse> {
  return {
    id: domain.id,
    name: domain.nameAscii,
    unicodeName: domain.nameUnicode,
    archived: domain.archivedAt !== null,
    createdAt: domain.createdAt.toISOString(),
  }
}

export function toDomainListResponse(
  domains: readonly Domain[],
): Static<typeof DomainListResponse> {
  return { domains: domains.map(toDomainResponse) }
}
