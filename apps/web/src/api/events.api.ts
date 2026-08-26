import type { StreamEvent } from "@ownsi/sdk"
import { ownsi } from "./ownsi.client.ts"

export type { StreamEvent } from "@ownsi/sdk"

export const subscribeToEvents = (onEvent: (event: StreamEvent) => void): (() => void) =>
  ownsi.events.subscribe(onEvent)
