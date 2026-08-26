import { CHALLENGE_LABEL } from "./diagnosis.ts"

/**
 * The zone Ownsi answers for itself, so a visitor with no DNS panel runs a claim to a proof.
 * `apps/web/src/lib/demo.constants.ts` offers the names under it and repeats this string.
 */
export const DEMO_ZONE = "demo.ownsi.dev"

export function isDemoName(name: string): boolean {
  return name === DEMO_ZONE || name.endsWith(`.${DEMO_ZONE}`)
}

export function demoDomainOf(name: string): string | null {
  const label = `${CHALLENGE_LABEL}.`
  if (!name.startsWith(label)) return null

  const domain = name.slice(label.length)
  return isDemoName(domain) ? domain : null
}

/** Every token a running verification waits on at one demo name — what the zone holds. */
export type ReadPendingTokens = (domain: string) => Promise<readonly string[]>
