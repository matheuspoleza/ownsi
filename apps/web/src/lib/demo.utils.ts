import { DEMO_ZONE } from "./demo.constants.ts"

export const isDemoName = (name: string): boolean =>
  name === DEMO_ZONE || name.endsWith(`.${DEMO_ZONE}`)
