export const DEMO_LABEL = "demo"

/** Repeats DEMO_ZONE in apps/api/src/verification/domain/demo-zone.ts, which answers for it. */
export const DEMO_ZONE = `${DEMO_LABEL}.ownsi.dev`

export const DEMO_DOMAINS: readonly string[] = [
  `acme.${DEMO_ZONE}`,
  `northwind.${DEMO_ZONE}`,
  `initech.${DEMO_ZONE}`,
  `globex.${DEMO_ZONE}`,
]
