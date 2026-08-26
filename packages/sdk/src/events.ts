import type { StreamEvent } from "@ownsi/api"

export type { StreamEvent } from "@ownsi/api"

export type Events = {
  /**
   * Opens the account's stream and calls back on every message. The returned function
   * closes it. A message says what moved and carries no state: read the resource back.
   */
  readonly subscribe: (onEvent: (event: StreamEvent) => void) => () => void
}

export function events(baseUrl: string): Events {
  return {
    subscribe(onEvent) {
      const source = new EventSource(`${baseUrl}/api/events`, { withCredentials: true })

      source.onmessage = (message) => onEvent(JSON.parse(message.data) as StreamEvent)

      return () => source.close()
    },
  }
}
