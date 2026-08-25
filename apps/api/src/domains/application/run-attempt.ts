import { type AccountDomain, challengeFor, withClaim } from "../domain/account-domain.ts"
import { applyAttempt } from "../domain/checkpoint.ts"
import type { Claim, OpenClaim } from "../domain/claim.ts"
import type { AnnounceClaim, CheckClaim, FindOtherClaimants } from "../domain/ports.ts"
import type { ClaimNotice } from "../domain/schedule.ts"

export type RunAttempt = (
  record: AccountDomain,
  claim: OpenClaim,
  now: Date,
) => Promise<AccountDomain>

export type RunAttemptDeps = {
  readonly checkClaim: CheckClaim
  readonly announce: AnnounceClaim
  readonly otherClaimants: FindOtherClaimants
}

export function createRunAttempt(deps: RunAttemptDeps): RunAttempt {
  return async (record, claim, now) => {
    const outcome = await deps.checkClaim(challengeFor(record, claim))
    const checkpoint = applyAttempt(claim, outcome, now)

    for (const notice of checkpoint.notices) {
      await tell(deps, record, claim, notice)
    }
    if (checkpoint.claim.state === "proved") await tellTheOthers(deps, record)

    return withClaim(record, checkpoint.claim)
  }
}

function tell(
  deps: RunAttemptDeps,
  record: AccountDomain,
  claim: Claim,
  notice: ClaimNotice,
): Promise<void> {
  return deps.announce({
    notice,
    userId: record.userId,
    domainId: record.domain.id,
    domain: record.domain.nameAscii,
    token: claim.token,
    claimId: claim.id,
  })
}

async function tellTheOthers(deps: RunAttemptDeps, record: AccountDomain): Promise<void> {
  const others = await deps.otherClaimants(record.domain.nameAscii, record.userId)

  for (const other of others) {
    await deps.announce({
      notice: { kind: "coexistence" },
      userId: other.userId,
      domainId: other.domainId,
      domain: record.domain.nameAscii,
      token: other.token,
      claimId: other.claimId,
    })
  }
}
