// The edge: a single origin. Static assets are served from here and /api/* and /p/*
// are proxied to Cloud Run, which keeps the better-auth cookie first-party. (PRD §3.1)
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  API_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/p/")) {
      const target = new URL(url.pathname + url.search, env.API_ORIGIN)
      return fetch(new Request(target, request))
    }

    return env.ASSETS.fetch(request)
  },
}
