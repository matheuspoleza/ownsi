import type { Domain } from "../domain/domain.ts"
import type { DomainRepository } from "../domain/ports.ts"

export type ListDomainNames = (userId: string) => Promise<readonly Domain[]>

export function listDomainNames(domains: DomainRepository): ListDomainNames {
  return (userId) => domains.listByUser(userId)
}
