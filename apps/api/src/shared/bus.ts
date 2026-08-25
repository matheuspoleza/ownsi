export type EventEnvelope<Name extends string, Data> = {
  readonly name: Name
  readonly data: Data
}

export type AnyEvent = EventEnvelope<string, never>

export type Publish<Event extends EventEnvelope<string, unknown>> = (event: Event) => Promise<void>

export type Subscribe<Event extends EventEnvelope<string, unknown>> = <Name extends Event["name"]>(
  name: Name,
  react: (data: Extract<Event, { name: Name }>["data"]) => Promise<void>,
) => void

export type EventBus<Event extends EventEnvelope<string, unknown>> = {
  readonly publish: Publish<Event>
  readonly on: Subscribe<Event>
}

type Reaction = (data: never) => Promise<void>

export function inProcessBus<Event extends EventEnvelope<string, unknown>>(): EventBus<Event> {
  const reactions = new Map<string, Reaction[]>()

  return {
    publish: async (event) => {
      for (const react of reactions.get(event.name) ?? []) await react(event.data as never)
    },
    on: (name, react) => {
      reactions.set(name, [...(reactions.get(name) ?? []), react as Reaction])
    },
  }
}
