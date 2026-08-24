import { api } from "./eden.client.ts"

const request = (name: string, signal?: AbortSignal) =>
  api.zones({ name }).get({ fetch: { signal } })

type ZoneRequest = Awaited<ReturnType<typeof request>>

type ZoneFrame = NonNullable<ZoneRequest["data"]>

export type ZoneStep = ZoneFrame["data"]

export type ZoneDelegation = Extract<ZoneStep, { step: "delegation" }>

export type ZonePublishing = Extract<ZoneStep, { step: "publishing" }>

export type ZoneErrorCode = "invalid_domain" | "no_delegation" | "unresolvable" | "unreachable"

export type ZoneFailure = Error & { readonly code: ZoneErrorCode }

export const RETRYABLE_ZONE_ERRORS: ReadonlySet<ZoneErrorCode> = new Set([
  "unresolvable",
  "unreachable",
])

const UNREACHABLE_MESSAGE = "We could not reach ownsi to read this zone. Check your connection."

const zoneFailure = (code: ZoneErrorCode, message: string): ZoneFailure =>
  Object.assign(new Error(message), { code })

const isZoneErrorCode = (value: unknown): value is ZoneErrorCode =>
  value === "invalid_domain" || value === "no_delegation" || value === "unresolvable"

const asZoneFailure = (error: NonNullable<ZoneRequest["error"]>): ZoneFailure => {
  const body: unknown = error.value
  if (body && typeof body === "object" && "error" in body) {
    const detail = (body as { error: { code?: unknown; message?: unknown } }).error
    if (isZoneErrorCode(detail.code) && typeof detail.message === "string")
      return zoneFailure(detail.code, detail.message)
  }
  return zoneFailure("unreachable", UNREACHABLE_MESSAGE)
}

export async function* readZone(name: string, signal?: AbortSignal): AsyncGenerator<ZoneStep> {
  const { data, error } = await request(name, signal)
  if (signal?.aborted) throw signal.reason
  if (error) throw asZoneFailure(error)
  if (!data) throw zoneFailure("unreachable", UNREACHABLE_MESSAGE)

  for await (const frame of framesOf(data)) yield frame.data
}

/**
 * Eden collapses a streamed route to its declared 200 schema, losing the generator wrapper its
 * own ReplaceGeneratorWithAsyncGenerator would otherwise apply.
 */
const framesOf = (data: ZoneFrame): AsyncIterable<ZoneFrame> =>
  data as ZoneFrame & AsyncIterable<ZoneFrame>
