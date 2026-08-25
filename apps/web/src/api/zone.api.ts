import type { ZoneStep } from "@ownsi/sdk"
import { ownsi } from "./ownsi.client.ts"

export type { OwnsiError, ZoneDelegation, ZonePublishing, ZoneStep } from "@ownsi/sdk"
export { RETRYABLE } from "@ownsi/sdk"

export const readZone = (name: string, signal?: AbortSignal): AsyncGenerator<ZoneStep> =>
  ownsi.zones.read(name, signal)
