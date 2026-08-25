import type { Treaty } from "./client.ts"
import { asOwnsiError, ownsiError } from "./error.ts"

type ZoneRequest = Awaited<ReturnType<ReturnType<Treaty["zones"]>["get"]>>

type ZoneFrame = NonNullable<ZoneRequest["data"]>

export type ZoneStep = ZoneFrame["data"]

export type ZoneDelegation = Extract<ZoneStep, { step: "delegation" }>

export type ZonePublishing = Extract<ZoneStep, { step: "publishing" }>

export type Zones = {
  /**
   * Streams what DNS answers in the order DNS answers it. Public: no session, and it
   * writes nothing.
   */
  readonly read: (name: string, signal?: AbortSignal) => AsyncGenerator<ZoneStep>
}

const NO_ANSWER = "We could not reach ownsi to read this zone. Check your connection."

export function zones(api: Treaty): Zones {
  return { read: (name, signal) => readZone(api, name, signal) }
}

async function* readZone(
  api: Treaty,
  name: string,
  signal?: AbortSignal,
): AsyncGenerator<ZoneStep> {
  const { data, error } = await api.zones({ name }).get({ fetch: { signal } })
  if (signal?.aborted) throw signal.reason
  if (error) throw asOwnsiError(error)
  if (!data) throw ownsiError("unreachable", NO_ANSWER)

  for await (const frame of framesOf(data)) yield frame.data
}

/**
 * Eden collapses a streamed route to its declared 200 schema, losing the generator wrapper its
 * own ReplaceGeneratorWithAsyncGenerator would otherwise apply.
 */
const framesOf = (data: ZoneFrame): AsyncIterable<ZoneFrame> =>
  data as ZoneFrame & AsyncIterable<ZoneFrame>
