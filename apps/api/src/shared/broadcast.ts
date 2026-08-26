export type Broadcast<Event> = {
  readonly publish: (userId: string, event: Event) => void
  /** Registers at once, so nothing published between here and the first read is lost. */
  readonly subscribe: (userId: string) => AsyncGenerator<Event>
}

export type BroadcastOptions<Event> = {
  /** Opens the stream and marks it alive, so a dead connection is noticed at both ends. */
  readonly heartbeat: () => Event
  readonly heartbeatMs: number
}

type Deliver<Event> = (event: Event) => void

export function inProcessBroadcast<Event>({
  heartbeat,
  heartbeatMs,
}: BroadcastOptions<Event>): Broadcast<Event> {
  const listening = new Map<string, Set<Deliver<Event>>>()

  const enrol = (userId: string, deliver: Deliver<Event>) => {
    const set = listening.get(userId) ?? new Set<Deliver<Event>>()
    set.add(deliver)
    listening.set(userId, set)

    return () => {
      set.delete(deliver)
      if (set.size === 0) listening.delete(userId)
    }
  }

  return {
    publish(userId, event) {
      for (const deliver of listening.get(userId) ?? []) deliver(event)
    },

    subscribe(userId) {
      const queued: Event[] = []
      let wake: (() => void) | null = null

      const leave = enrol(userId, (event) => {
        queued.push(event)
        wake?.()
        wake = null
      })

      const idled = () =>
        new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(true), heartbeatMs)
          wake = () => {
            clearTimeout(timer)
            resolve(false)
          }
        })

      const stream = async function* () {
        try {
          yield heartbeat()

          while (true) {
            const next = queued.shift()
            if (next !== undefined) {
              yield next
              continue
            }

            if (await idled()) yield heartbeat()
          }
        } finally {
          leave()
        }
      }

      return stream()
    },
  }
}
