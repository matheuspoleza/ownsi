import { DEMO_CLAIMS, DEMO_TOKEN } from "../../shared/demo.ts"
import { type Claim, type NewClaim, startPending } from "../domain/claim.ts"
import type { StartClaim } from "../domain/ports.ts"

const CATALOGUE = new Map(DEMO_CLAIMS.map((claim) => [claim.domain, claim]))

const instant = (value: string | null) => (value === null ? null : new Date(value))

export const startFromCatalogue: StartClaim = (params: NewClaim): Claim => {
  const demo = CATALOGUE.get(params.domain)
  if (!demo) return startPending(params)

  return {
    id: params.id,
    userId: params.userId,
    domain: demo.domain,
    token: DEMO_TOKEN,
    status: demo.status,
    lastOutcome: demo.lastOutcome,
    diagnosis: demo.diagnosis,
    waitEstimate: demo.waitEstimate,
    firstVerifiedAt: instant(demo.firstVerifiedAt),
    lastConfirmedAt: instant(demo.lastConfirmedAt),
    coexistence: demo.coexistence,
    createdAt: params.createdAt,
  }
}
