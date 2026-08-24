interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  API_ORIGIN: string
  RL_ZONES: RateLimiter
  RL_PROOF: RateLimiter
}

const RETRY_AFTER_SECONDS = 60

const RATE_LIMITED_PATHS: ReadonlyArray<readonly [string, keyof Env]> = [
  ["/api/zones/", "RL_ZONES"],
  ["/p/", "RL_PROOF"],
]

const PROXIED_PREFIXES = ["/api/", "/p/"]

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const refusal = await enforceRateLimit(request, env, url)
    if (refusal) return refusal

    if (PROXIED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      return fetch(new Request(new URL(url.pathname + url.search, env.API_ORIGIN), request))
    }

    return env.ASSETS.fetch(request)
  },
}

async function enforceRateLimit(request: Request, env: Env, url: URL): Promise<Response | null> {
  const policy = RATE_LIMITED_PATHS.find(([prefix]) => url.pathname.startsWith(prefix))
  if (!policy) return null

  const [, binding] = policy
  const limiter = env[binding] as RateLimiter | undefined
  if (!limiter?.limit) return null

  const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown"
  const { success } = await limiter.limit({ key: `${binding}:${clientIp}` })
  if (success) return null

  return Response.json(
    {
      error: {
        code: "rate_limited",
        message: "Too many requests. Wait a moment and try again.",
        docsUrl: "https://ownsi.dev/docs/errors#rate_limited",
      },
    },
    {
      status: 429,
      headers: {
        "retry-after": String(RETRY_AFTER_SECONDS),
        "cache-control": "no-store",
      },
    },
  )
}
