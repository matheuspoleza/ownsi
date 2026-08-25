import { err, ok, type Result } from "../../shared/result.ts"
import type { Diagnosis } from "../../verification/verification.contract.ts"
import { isOpen } from "../domain/claim.ts"
import { noticesBetween } from "../domain/notice.ts"
import type { ClaimRepository, FindDomain, SendNotice } from "../domain/ports.ts"

export type NotifyClaimantInput = {
  readonly claimId: string
  readonly diagnosis: Diagnosis
  readonly since: Date
  readonly at: Date
}

export type NotifyClaimantError = { readonly type: "not_found" } | { readonly type: "claim_ended" }

export type NotifyClaimant = (
  input: NotifyClaimantInput,
) => Promise<Result<void, NotifyClaimantError>>

export type NotifyClaimantDeps = {
  readonly claims: ClaimRepository
  readonly findDomain: FindDomain
  readonly sendNotice: SendNotice
}

export function notifyClaimant(deps: NotifyClaimantDeps): NotifyClaimant {
  return async ({ claimId, diagnosis, since, at }) => {
    const found = await deps.claims.findById(claimId)
    if (found === null) return err({ type: "not_found" })
    if (!isOpen(found)) return err({ type: "claim_ended" })

    const notices = noticesBetween(found.createdAt, since, at, diagnosis)
    if (notices.length === 0) return ok(undefined)

    const domain = await deps.findDomain({ userId: found.userId, domainId: found.domainId })
    if (domain === null) return err({ type: "not_found" })

    for (const notice of notices) {
      await deps.sendNotice({
        notice,
        claimId: found.id,
        userId: found.userId,
        domainId: found.domainId,
        domain: domain.nameAscii,
        token: found.token,
      })
    }

    return ok(undefined)
  }
}
