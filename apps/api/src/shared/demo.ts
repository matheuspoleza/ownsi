import type { Coexistence, EndedState, WaitEstimate } from "./claim-lifecycle.ts"
import type { Diagnosis } from "./diagnosis.ts"

export type DemoCheck =
  | { readonly outcome: "found" }
  | { readonly outcome: "absent"; readonly diagnosis: Diagnosis }
  | { readonly outcome: "unresolvable" }

export type DemoClaim =
  | {
      readonly state: "pending"
      readonly check: DemoCheck | null
      readonly waitEstimate: WaitEstimate | null
      readonly openedDaysAgo: number
    }
  | {
      readonly state: EndedState
      readonly check: DemoCheck
      readonly openedDaysAgo: number
      readonly endedDaysAgo: number
    }

export type DemoDomain = {
  readonly domain: string
  readonly shows: string
  readonly nameservers: readonly string[]
  readonly claim: DemoClaim
  readonly history: readonly DemoClaim[]
  readonly archivedDaysAgo: number | null
  readonly coexistence: Coexistence | null
}

export const DEMO_TOKEN = "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058"

const FOREIGN_TOKEN = "ownsi_v1_1b8e0d4a37c95f26ae80b41d5c93f7e2"
const PREVIOUS_TOKEN = "ownsi_v1_4c07e9a2d61b83f5029ae7c4b1d6083f"

const CLOUDFLARE = ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"] as const
const GODADDY = ["ns17.domaincontrol.com", "ns18.domaincontrol.com"] as const
const ROUTE53 = ["ns-1.awsdns-01.com", "ns-2.awsdns-02.org", "ns-3.awsdns-03.net"] as const
const NAMECHEAP = ["dns1.registrar-servers.com", "dns2.registrar-servers.com"] as const
const VERCEL = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"] as const

const RESOLVERS = ["Google", "Cloudflare", "Quad9"] as const

const alone = { history: [], archivedDaysAgo: null, coexistence: null } as const

const stuck = (diagnosis: Diagnosis): DemoClaim => ({
  state: "pending",
  check: { outcome: "absent", diagnosis },
  waitEstimate: null,
  openedDaysAgo: 1,
})

const proved = (daysAgo: number): DemoClaim => ({
  state: "proved",
  check: { outcome: "found" },
  openedDaysAgo: daysAgo,
  endedDaysAgo: daysAgo,
})

const MISSING: Diagnosis = { code: "record_absent", observed: { answer: { type: "nxdomain" } } }

export const DEMO_DOMAINS: readonly DemoDomain[] = [
  {
    domain: "pending.ownsi.dev",
    shows: "Just claimed. The record to create, and nothing checked yet.",
    nameservers: CLOUDFLARE,
    claim: {
      state: "pending",
      check: null,
      waitEstimate: { reason: "first_check", secondsRemaining: 30 },
      openedDaysAgo: 0,
    },
    ...alone,
  },
  {
    domain: "domain-appended.ownsi.dev",
    shows: "The registrar appended the domain to the host field.",
    nameservers: GODADDY,
    claim: stuck({
      code: "domain_appended",
      observed: { name: "_ownsi-challenge.domain-appended.ownsi.dev.domain-appended.ownsi.dev" },
    }),
    ...alone,
  },
  {
    domain: "record-at-apex.ownsi.dev",
    shows: "The token was pasted on the domain itself.",
    nameservers: CLOUDFLARE,
    claim: stuck({
      code: "record_at_apex",
      observed: { name: "record-at-apex.ownsi.dev", value: DEMO_TOKEN },
    }),
    ...alone,
  },
  {
    domain: "foreign-token.ownsi.dev",
    shows: "Right host, a token issued to somebody else.",
    nameservers: ROUTE53,
    claim: stuck({ code: "foreign_token", observed: { value: FOREIGN_TOKEN } }),
    ...alone,
  },
  {
    domain: "expired-token.ownsi.dev",
    shows: "Claimed again, with the last claim's record still sitting in the zone.",
    nameservers: VERCEL,
    claim: stuck({ code: "expired_token", observed: { value: PREVIOUS_TOKEN } }),
    history: [
      {
        state: "expired",
        check: { outcome: "absent", diagnosis: MISSING },
        openedDaysAgo: 12,
        endedDaysAgo: 5,
      },
    ],
    archivedDaysAgo: null,
    coexistence: null,
  },
  {
    domain: "value-formatted.ownsi.dev",
    shows: "The panel wrapped the value in quotes.",
    nameservers: NAMECHEAP,
    claim: stuck({ code: "value_formatted", observed: { value: `"${DEMO_TOKEN}" ` } }),
    ...alone,
  },
  {
    domain: "no-matching-record.ownsi.dev",
    shows: "Other TXT records on the host, none of them the token.",
    nameservers: CLOUDFLARE,
    claim: stuck({
      code: "no_matching_record",
      observed: {
        values: [
          "v=spf1 include:_spf.google.com ~all",
          "google-site-verification=8Rp2qXm4L0nWc7fT",
        ],
      },
    }),
    ...alone,
  },
  {
    domain: "cname-conflict.ownsi.dev",
    shows: "A CNAME already occupies the challenge host.",
    nameservers: VERCEL,
    claim: stuck({ code: "cname_conflict", observed: { target: "proxy.example-cdn.net" } }),
    ...alone,
  },
  {
    domain: "record-absent.ownsi.dev",
    shows: "NXDOMAIN — the name does not exist at all.",
    nameservers: CLOUDFLARE,
    claim: stuck(MISSING),
    ...alone,
  },
  {
    domain: "record-nodata.ownsi.dev",
    shows: "NODATA — the name exists, carrying the wrong type.",
    nameservers: GODADDY,
    claim: stuck({
      code: "record_absent",
      observed: { answer: { type: "nodata", types: ["A", "AAAA"] } },
    }),
    ...alone,
  },
  {
    domain: "record-on-www.ownsi.dev",
    shows: "The record went under www.",
    nameservers: NAMECHEAP,
    claim: stuck({
      code: "record_on_www",
      observed: { name: "_ownsi-challenge.www.record-on-www.ownsi.dev", value: DEMO_TOKEN },
    }),
    ...alone,
  },
  {
    domain: "not-published.ownsi.dev",
    shows: "The authoritative nameservers never received it.",
    nameservers: GODADDY,
    claim: stuck({ code: "not_published", observed: { nameservers: GODADDY } }),
    ...alone,
  },
  {
    domain: "negative-cache.ownsi.dev",
    shows: "Published and spreading, with the wait quantified from the SOA.",
    nameservers: CLOUDFLARE,
    claim: {
      state: "pending",
      check: {
        outcome: "absent",
        diagnosis: { code: "negative_cache", observed: { secondsRemaining: 240 } },
      },
      waitEstimate: { reason: "negative_cache", secondsRemaining: 240 },
      openedDaysAgo: 0,
    },
    ...alone,
  },
  {
    domain: "servfail.ownsi.dev",
    shows: "SERVFAIL — a broken zone, not a missing record.",
    nameservers: ROUTE53,
    claim: stuck({ code: "servfail", observed: { resolvers: RESOLVERS } }),
    ...alone,
  },
  {
    domain: "lame-delegation.ownsi.dev",
    shows: "The delegated nameservers do not answer.",
    nameservers: NAMECHEAP,
    claim: stuck({ code: "lame_delegation", observed: { nameservers: NAMECHEAP } }),
    ...alone,
  },
  {
    domain: "unresolvable.ownsi.dev",
    shows: "Our failure. Counts against nobody, notifies nobody.",
    nameservers: CLOUDFLARE,
    claim: {
      state: "pending",
      check: { outcome: "unresolvable" },
      waitEstimate: { reason: "first_check", secondsRemaining: 60 },
      openedDaysAgo: 0,
    },
    ...alone,
  },
  {
    domain: "expired.ownsi.dev",
    shows: "The window closed. History, and one click to start again.",
    nameservers: CLOUDFLARE,
    claim: {
      state: "expired",
      check: { outcome: "absent", diagnosis: MISSING },
      openedDaysAgo: 9,
      endedDaysAgo: 2,
    },
    ...alone,
  },
  {
    domain: "canceled.ownsi.dev",
    shows: "Stopped on purpose, before the window ran out.",
    nameservers: NAMECHEAP,
    claim: {
      state: "canceled",
      check: { outcome: "absent", diagnosis: MISSING },
      openedDaysAgo: 3,
      endedDaysAgo: 1,
    },
    ...alone,
  },
  {
    domain: "proved.ownsi.dev",
    shows: "Proved, dated, and never rechecked on a timer.",
    nameservers: CLOUDFLARE,
    claim: proved(165),
    ...alone,
  },
  {
    domain: "reproved.ownsi.dev",
    shows: "A second claim, a second date. The first proof keeps its own.",
    nameservers: ROUTE53,
    claim: proved(6),
    history: [
      {
        state: "expired",
        check: { outcome: "absent", diagnosis: MISSING },
        openedDaysAgo: 40,
        endedDaysAgo: 33,
      },
      proved(210),
    ],
    archivedDaysAgo: null,
    coexistence: null,
  },
  {
    domain: "coexisting.ownsi.dev",
    shows: "Another account proved the same domain. Both stay true.",
    nameservers: CLOUDFLARE,
    claim: proved(165),
    history: [],
    archivedDaysAgo: null,
    coexistence: { maskedEmail: "m•••@acme.com", provedAt: "2026-08-21T17:55:12.000Z" },
  },
  {
    domain: "archived.ownsi.dev",
    shows: "Off the list on request, with nothing about it retracted.",
    nameservers: GODADDY,
    claim: {
      state: "canceled",
      check: { outcome: "absent", diagnosis: MISSING },
      openedDaysAgo: 12,
      endedDaysAgo: 5,
    },
    history: [],
    archivedDaysAgo: 5,
    coexistence: null,
  },
]
