import type { AccountDomain } from "../domain/account-domain.ts"
import type { Coexistence } from "../domain/claim-lifecycle.ts"
import type { FindCoexistence } from "../domain/ports.ts"

export type DomainView = {
  readonly record: AccountDomain
  readonly coexistence: Coexistence | null
}

export type ViewDomain = (record: AccountDomain) => Promise<DomainView>

export function createViewDomain(findCoexistence: FindCoexistence): ViewDomain {
  return async (record) => ({
    record,
    coexistence: await findCoexistence(record.domain, record.userId),
  })
}
