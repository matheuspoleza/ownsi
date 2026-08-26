import type { FetchLike } from "../src/client.ts"

export type Answered = {
  readonly status?: number
  readonly body?: unknown
}

export type Call = {
  readonly method: string
  readonly path: string
  readonly body: unknown
}

export type FakeApi = {
  readonly fetch: FetchLike
  readonly calls: readonly Call[]
  readonly answer: (route: string, answered: Answered) => void
}

export function fakeApi(): FakeApi {
  const answers = new Map<string, Answered>()
  const calls: Call[] = []

  const fetcher: FetchLike = async (input, init) => {
    const request = new Request(input, init)
    const { pathname } = new URL(request.url)
    const body = request.body === null ? null : await request.json()

    calls.push({ method: request.method, path: pathname, body })

    const answered = answers.get(`${request.method} ${pathname}`) ?? { status: 404 }

    if (answered.body === undefined) return new Response(null, { status: answered.status ?? 204 })

    return new Response(JSON.stringify(answered.body), {
      status: answered.status ?? 200,
      headers: { "content-type": "application/json" },
    })
  }

  return {
    fetch: fetcher,
    calls,
    answer: (route, answered) => {
      answers.set(route, answered)
    },
  }
}

export function errorBody(code: string, message: string) {
  return { error: { code, message, docsUrl: `https://docs.ownsi.dev/errors#${code}` } }
}

export const DOMAIN = {
  id: "dom_1",
  name: "acme.com",
  unicodeName: "acme.com",
  archived: false,
  createdAt: "2026-08-24T12:00:00.000Z",
}

export const RECORD = {
  host: "_ownsi-challenge",
  name: "_ownsi-challenge.acme.com",
  type: "TXT" as const,
  value: "ownsi_v1_token",
}

export const CLAIM = {
  id: "clm_1",
  domainId: "dom_1",
  domain: "acme.com",
  unicodeDomain: "acme.com",
  state: "pending" as const,
  token: "ownsi_v1_token",
  records: [RECORD],
  verificationId: "vrf_1",
  expiresAt: "2026-08-31T12:00:00.000Z",
  endedAt: null,
  createdAt: "2026-08-24T12:00:00.000Z",
  coexistence: null,
}

export const VERIFICATION = {
  id: "vrf_1",
  claimId: "clm_1",
  method: "dns_txt" as const,
  status: "checking" as const,
  lastOutcome: null,
  diagnosis: null,
  waitEstimate: { reason: "first_check" as const, secondsRemaining: 30 },
  lastRunAt: null,
  nextRunAt: "2026-08-24T12:00:30.000Z",
  deadline: "2026-08-31T12:00:00.000Z",
  createdAt: "2026-08-24T12:00:00.000Z",
}
