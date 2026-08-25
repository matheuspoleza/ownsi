import type { Clock } from "../../shared/clock.ts"
import { err, ok, type Result } from "../../shared/result.ts"
import { type AccountDomain, archive, pendingClaim, withClaim } from "../domain/account-domain.ts"
import { end, type OpenClaim } from "../domain/claim.ts"
import type { AccountDomainRepository } from "../domain/ports.ts"
import type { DomainView, ViewDomain } from "./domain-view.ts"
import type { DomainNotFound } from "./read-domain.ts"
import type { RunAttempt } from "./run-attempt.ts"

export type ClaimEnded = { readonly type: "claim_ended" }

export type ClaimActionError = DomainNotFound | ClaimEnded

export type ClaimActionInput = {
  readonly userId: string
  readonly id: string
}

export type ClaimAction = (input: ClaimActionInput) => Promise<Result<DomainView, ClaimActionError>>

export type ClaimActionDeps = {
  readonly domains: AccountDomainRepository
  readonly view: ViewDomain
  readonly clock: Clock
}

export function createCancelClaim(deps: ClaimActionDeps): ClaimAction {
  return onOpenClaim(deps, (record, open, now) => withClaim(record, end(open, "canceled", now)))
}

export type RequestCheckDeps = ClaimActionDeps & {
  readonly runAttempt: RunAttempt
}

export function createRequestCheck(deps: RequestCheckDeps): ClaimAction {
  return onOpenClaim(deps, (record, open, now) => deps.runAttempt(record, open, now))
}

export function createArchiveDomain(deps: ClaimActionDeps): ClaimAction {
  return async ({ userId, id }) => {
    const record = await deps.domains.findById(userId, id)
    if (!record) return err({ type: "not_found" })

    const archived = archive(record, deps.clock())
    await deps.domains.save(archived)
    return ok(await deps.view(archived))
  }
}

function onOpenClaim(
  deps: ClaimActionDeps,
  apply: (
    record: AccountDomain,
    open: OpenClaim,
    now: Date,
  ) => AccountDomain | Promise<AccountDomain>,
): ClaimAction {
  return async ({ userId, id }) => {
    const record = await deps.domains.findById(userId, id)
    if (!record) return err({ type: "not_found" })

    const open = pendingClaim(record)
    if (!open) return err({ type: "claim_ended" })

    const moved = await apply(record, open, deps.clock())
    await deps.domains.save(moved)
    return ok(await deps.view(moved))
  }
}
