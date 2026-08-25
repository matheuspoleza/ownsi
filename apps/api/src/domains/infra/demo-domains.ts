import { CLAIM_WINDOW_DAYS } from "../../shared/claim-lifecycle.ts"
import { DEMO_DOMAINS, DEMO_TOKEN, type DemoCheck, type DemoClaim } from "../../shared/demo.ts"
import { type Claim, daysAfter, type LastCheck, openClaim } from "../domain/claim.ts"
import type { FindCoexistence, NewAccountDomain, StartDomain } from "../domain/ports.ts"

const CATALOGUE = new Map(DEMO_DOMAINS.map((entry) => [entry.domain, entry]))

export const startFromCatalogue: StartDomain = (params) => {
  const demo = CATALOGUE.get(params.domain.nameAscii)

  if (!demo) {
    return {
      userId: params.userId,
      domain: params.domain,
      claim: openClaim({
        id: params.claimId,
        userId: params.userId,
        domainId: params.domain.id,
        token: params.token,
        openedAt: params.now,
      }),
      history: [],
      archivedAt: null,
    }
  }

  return {
    userId: params.userId,
    domain: params.domain,
    claim: replay(demo.claim, params, 0),
    history: demo.history.map((entry, index) => replay(entry, params, index + 1)),
    archivedAt: daysBefore(params.now, demo.archivedDaysAgo),
  }
}

export const coexistenceFromCatalogue: FindCoexistence = async (domain) =>
  CATALOGUE.get(domain.nameAscii)?.coexistence ?? null

function replay(demo: DemoClaim, params: NewAccountDomain, index: number): Claim {
  const openedAt = daysAgo(params.now, demo.openedDaysAgo)

  const facts = {
    id: index === 0 ? params.claimId : `${params.claimId}_${index}`,
    userId: params.userId,
    domainId: params.domain.id,
    token: DEMO_TOKEN,
    lastCheck: recall(demo.check, params.now),
    createdAt: openedAt,
  }

  if (demo.state === "pending") {
    return {
      ...facts,
      state: "pending",
      waitEstimate: demo.waitEstimate,
      expiresAt: daysAfter(openedAt, CLAIM_WINDOW_DAYS),
    }
  }

  return { ...facts, state: demo.state, endedAt: daysAgo(params.now, demo.endedDaysAgo) }
}

function recall(check: DemoCheck | null, now: Date): LastCheck | null {
  if (check === null) return null
  if (check.outcome === "absent") {
    return { outcome: "absent", diagnosis: check.diagnosis, at: now }
  }
  return { outcome: check.outcome, at: now }
}

function daysAgo(now: Date, days: number): Date {
  return daysAfter(now, -days)
}

function daysBefore(now: Date, days: number | null): Date | null {
  return days === null ? null : daysAgo(now, days)
}
