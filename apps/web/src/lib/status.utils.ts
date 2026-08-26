import type { ClaimState } from "../api/claim.api.ts"
import type { Verification, VerificationStatus } from "../api/verification.api.ts"
import type { DomainFilter, DomainStatus } from "./status.constants.ts"

const RUNNING_STATUSES: Record<VerificationStatus, DomainStatus> = {
  checking: "checking",
  propagating: "checking",
  needs_attention: "pending",
  proved: "proved",
  exhausted: "expired",
  stopped: "canceled",
}

/** Where the name stands before the verification is consulted: the claim's own state. */
export const claimStanding = (claim: { state: ClaimState } | null): DomainFilter =>
  claim === null ? "unclaimed" : claim.state

/**
 * The server settles which claim is in play; the verification only tells the open ones
 * apart — one still looking from one already waiting on the person. A domain off the list
 * reads as archived whatever its claim did, because that is the fact the row is about.
 */
export const domainStatus = (
  standing: DomainFilter,
  verification: Verification | null,
  archived = false,
): DomainStatus => {
  if (archived) return "archived"
  if (standing !== "pending") return standing
  if (verification === null) return "checking"

  return RUNNING_STATUSES[verification.status]
}
