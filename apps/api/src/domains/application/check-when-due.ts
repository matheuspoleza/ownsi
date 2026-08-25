import type { Clock } from "../../shared/clock.ts"
import { pendingClaim, withClaim } from "../domain/account-domain.ts"
import { expire, isDue } from "../domain/checkpoint.ts"
import type { AccountDomainRepository, CheckWhenDue } from "../domain/ports.ts"
import type { RunAttempt } from "./run-attempt.ts"

export type CheckWhenDueDeps = {
  readonly domains: AccountDomainRepository
  readonly runAttempt: RunAttempt
  readonly clock: Clock
}

export function createCheckWhenDue(deps: CheckWhenDueDeps): CheckWhenDue {
  return async ({ userId, domainId }) => {
    const record = await deps.domains.findById(userId, domainId)
    const open = record === null ? null : pendingClaim(record)
    if (record === null || open === null) return null

    const now = deps.clock()
    if (now < open.expiresAt && !isDue(open, now)) return open.nextCheckAt

    const moved =
      now < open.expiresAt
        ? await deps.runAttempt(record, open, now)
        : withClaim(record, expire(open, now).claim)

    await deps.domains.save(moved)
    return pendingClaim(moved)?.nextCheckAt ?? null
  }
}
