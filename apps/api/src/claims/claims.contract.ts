import type { EventEnvelope } from "../shared/bus.ts"
import type { Claim, EndedState } from "./domain/claim.ts"
import type { Coexistence } from "./domain/coexistence.ts"
import type { ClaimedDomain } from "./domain/ports.ts"

export type { Claim, ClaimState, EndedState, OpenClaim } from "./domain/claim.ts"
export { CLAIM_STATES, CLAIM_WINDOW_DAYS, isOpen } from "./domain/claim.ts"
export type { ClaimedDomain } from "./domain/ports.ts"

export type ClaimView = {
  readonly claim: Claim
  readonly domain: ClaimedDomain
}

export type ClaimDetail = ClaimView & {
  readonly coexistence: Coexistence | null
}

export type ClaimEnded = {
  readonly claimId: string
  readonly userId: string
  readonly domainId: string
  readonly reason: EndedState
  readonly endedAt: Date
}

export type ClaimEvent = EventEnvelope<"claims/claim.ended", ClaimEnded>
