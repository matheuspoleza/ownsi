import type { CheckOutcome, ClaimStatus, Coexistence, WaitEstimate } from "./claim-status.ts"
import type { Diagnosis } from "./diagnosis.ts"

export type DemoClaim = {
  readonly domain: string
  readonly shows: string
  readonly nameservers: readonly string[]
  readonly status: ClaimStatus
  readonly lastOutcome: CheckOutcome | null
  readonly diagnosis: Diagnosis | null
  readonly waitEstimate: WaitEstimate | null
  readonly firstVerifiedAt: string | null
  readonly lastConfirmedAt: string | null
  readonly coexistence: Coexistence | null
}

export const DEMO_TOKEN = "ownsi_v1_9f3a1c7d5e2b48a0c6f1d93b7e4a2058"

const FOREIGN_TOKEN = "ownsi_v1_1b8e0d4a37c95f26ae80b41d5c93f7e2"

const CLOUDFLARE = ["kate.ns.cloudflare.com", "rob.ns.cloudflare.com"] as const
const GODADDY = ["ns17.domaincontrol.com", "ns18.domaincontrol.com"] as const
const ROUTE53 = ["ns-1.awsdns-01.com", "ns-2.awsdns-02.org", "ns-3.awsdns-03.net"] as const
const NAMECHEAP = ["dns1.registrar-servers.com", "dns2.registrar-servers.com"] as const
const VERCEL = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"] as const

const RESOLVERS = ["Google", "Cloudflare", "Quad9"] as const

const settled = {
  waitEstimate: null,
  firstVerifiedAt: null,
  lastConfirmedAt: null,
  coexistence: null,
} as const

export const DEMO_CLAIMS: readonly DemoClaim[] = [
  {
    domain: "pending.ownsi.dev",
    shows: "Just claimed. The record to create, and nothing checked yet.",
    nameservers: CLOUDFLARE,
    status: "pending",
    lastOutcome: null,
    diagnosis: null,
    waitEstimate: { reason: "first_check", secondsRemaining: 30 },
    firstVerifiedAt: null,
    lastConfirmedAt: null,
    coexistence: null,
  },
  {
    domain: "domain-appended.ownsi.dev",
    shows: "The registrar appended the domain to the host field.",
    nameservers: GODADDY,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: {
      code: "domain_appended",
      observed: { name: "_ownsi-challenge.domain-appended.ownsi.dev.domain-appended.ownsi.dev" },
    },
    ...settled,
  },
  {
    domain: "record-at-apex.ownsi.dev",
    shows: "The token was pasted on the domain itself.",
    nameservers: CLOUDFLARE,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: {
      code: "record_at_apex",
      observed: { name: "record-at-apex.ownsi.dev", value: DEMO_TOKEN },
    },
    ...settled,
  },
  {
    domain: "foreign-token.ownsi.dev",
    shows: "Right host, leftover token from an earlier claim.",
    nameservers: ROUTE53,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "foreign_token", observed: { value: FOREIGN_TOKEN } },
    ...settled,
  },
  {
    domain: "value-formatted.ownsi.dev",
    shows: "The panel wrapped the value in quotes.",
    nameservers: NAMECHEAP,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "value_formatted", observed: { value: `"${DEMO_TOKEN}" ` } },
    ...settled,
  },
  {
    domain: "no-matching-record.ownsi.dev",
    shows: "Other TXT records on the host, none of them the token.",
    nameservers: CLOUDFLARE,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: {
      code: "no_matching_record",
      observed: {
        values: [
          "v=spf1 include:_spf.google.com ~all",
          "google-site-verification=8Rp2qXm4L0nWc7fT",
        ],
      },
    },
    ...settled,
  },
  {
    domain: "cname-conflict.ownsi.dev",
    shows: "A CNAME already occupies the challenge host.",
    nameservers: VERCEL,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "cname_conflict", observed: { target: "proxy.example-cdn.net" } },
    ...settled,
  },
  {
    domain: "record-absent.ownsi.dev",
    shows: "NXDOMAIN — the name does not exist at all.",
    nameservers: CLOUDFLARE,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "record_absent", observed: { answer: { type: "nxdomain" } } },
    ...settled,
  },
  {
    domain: "record-nodata.ownsi.dev",
    shows: "NODATA — the name exists, carrying the wrong type.",
    nameservers: GODADDY,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: {
      code: "record_absent",
      observed: { answer: { type: "nodata", types: ["A", "AAAA"] } },
    },
    ...settled,
  },
  {
    domain: "record-on-www.ownsi.dev",
    shows: "The record went under www.",
    nameservers: NAMECHEAP,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: {
      code: "record_on_www",
      observed: { name: "_ownsi-challenge.www.record-on-www.ownsi.dev", value: DEMO_TOKEN },
    },
    ...settled,
  },
  {
    domain: "not-published.ownsi.dev",
    shows: "The authoritative nameservers never received it.",
    nameservers: GODADDY,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "not_published", observed: { nameservers: GODADDY } },
    ...settled,
  },
  {
    domain: "negative-cache.ownsi.dev",
    shows: "Published and spreading, with the wait quantified from the SOA.",
    nameservers: CLOUDFLARE,
    status: "propagating",
    lastOutcome: "absent",
    diagnosis: { code: "negative_cache", observed: { secondsRemaining: 240 } },
    waitEstimate: { reason: "negative_cache", secondsRemaining: 240 },
    firstVerifiedAt: null,
    lastConfirmedAt: null,
    coexistence: null,
  },
  {
    domain: "servfail.ownsi.dev",
    shows: "SERVFAIL — a broken zone, not a missing record.",
    nameservers: ROUTE53,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "servfail", observed: { resolvers: RESOLVERS } },
    ...settled,
  },
  {
    domain: "lame-delegation.ownsi.dev",
    shows: "The delegated nameservers do not answer.",
    nameservers: NAMECHEAP,
    status: "needs_attention",
    lastOutcome: "absent",
    diagnosis: { code: "lame_delegation", observed: { nameservers: NAMECHEAP } },
    ...settled,
  },
  {
    domain: "unresolvable.ownsi.dev",
    shows: "Our failure. Counts against nobody, notifies nobody.",
    nameservers: CLOUDFLARE,
    status: "pending",
    lastOutcome: "unresolvable",
    diagnosis: null,
    waitEstimate: { reason: "first_check", secondsRemaining: 60 },
    firstVerifiedAt: null,
    lastConfirmedAt: null,
    coexistence: null,
  },
  {
    domain: "dormant.ownsi.dev",
    shows: "Seven days unresolved. Checking stopped, the token intact.",
    nameservers: CLOUDFLARE,
    status: "paused",
    lastOutcome: "absent",
    diagnosis: { code: "record_absent", observed: { answer: { type: "nxdomain" } } },
    ...settled,
  },
  {
    domain: "proved.ownsi.dev",
    shows: "Proved, dated, and never rechecked on a timer.",
    nameservers: CLOUDFLARE,
    status: "proved",
    lastOutcome: "found",
    diagnosis: null,
    waitEstimate: null,
    firstVerifiedAt: "2026-03-12T14:02:41.000Z",
    lastConfirmedAt: "2026-03-12T14:02:41.000Z",
    coexistence: null,
  },
  {
    domain: "reconfirmed.ownsi.dev",
    shows: "Check again moved the confirmation forward, first proof unchanged.",
    nameservers: ROUTE53,
    status: "proved",
    lastOutcome: "found",
    diagnosis: null,
    waitEstimate: null,
    firstVerifiedAt: "2026-03-12T14:02:41.000Z",
    lastConfirmedAt: "2026-08-19T09:41:07.000Z",
    coexistence: null,
  },
  {
    domain: "coexisting.ownsi.dev",
    shows: "Another account proved the same domain. Both stay true.",
    nameservers: CLOUDFLARE,
    status: "proved",
    lastOutcome: "found",
    diagnosis: null,
    waitEstimate: null,
    firstVerifiedAt: "2026-03-12T14:02:41.000Z",
    lastConfirmedAt: "2026-03-12T14:02:41.000Z",
    coexistence: { maskedEmail: "m•••@acme.com", provedAt: "2026-08-21T17:55:12.000Z" },
  },
  {
    domain: "archived.ownsi.dev",
    shows: "Removed from the list, reactivable from the autocomplete.",
    nameservers: GODADDY,
    status: "archived",
    lastOutcome: "absent",
    diagnosis: null,
    ...settled,
  },
]
