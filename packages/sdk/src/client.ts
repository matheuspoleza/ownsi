import { treaty } from "@elysiajs/eden"
import type { App } from "@ownsi/api"
import { asOwnsiError, type OwnsiError, ownsiError } from "./error.ts"

/** Narrower than `typeof fetch`, whose extras differ between the browser and Bun. */
export type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>

export type OwnsiConfig = {
  /** Where the API lives. In a browser this is almost always `window.location.origin`. */
  readonly baseUrl: string
  readonly fetch?: FetchLike
}

export type Treaty = ReturnType<typeof treaty<App>>["api"]

const NO_ANSWER = "The API answered with nothing where a body was expected."

export function createTreaty(config: OwnsiConfig): Treaty {
  return treaty<App>(config.baseUrl, {
    fetcher: config.fetch as typeof fetch | undefined,
    fetch: { credentials: "include" },
  }).api
}

export async function unwrap<Data>(
  request: Promise<{ data: Data | null; error: unknown }>,
): Promise<Data> {
  const { data, error } = await answered(request)
  if (error) throw asOwnsiError(error)
  if (data === null) throw ownsiError("unreachable", NO_ANSWER)

  return data
}

export async function expectNoContent(request: Promise<{ error: unknown }>): Promise<void> {
  const { error } = await answered(request)
  if (error) throw asOwnsiError(error)
}

/**
 * A request that never arrived throws where one that failed returns. Both are our side of
 * the line, so both become `unreachable` rather than something about somebody's domain.
 */
async function answered<Answer extends { error: unknown }>(
  request: Promise<Answer>,
): Promise<Answer | { data: null; error: OwnsiError }> {
  try {
    return await request
  } catch (thrown) {
    return { data: null, error: asOwnsiError(thrown) }
  }
}
