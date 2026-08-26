import { asClaim, type Claim, type ClaimData, type ClaimDetail, createClaim } from "./claims.ts"
import { expectNoContent, type Treaty, unwrap } from "./client.ts"

export type DomainData = NonNullable<
  Awaited<ReturnType<ReturnType<Treaty["domains"]>["get"]>>["data"]
>

type ListBody = NonNullable<Awaited<ReturnType<Treaty["domains"]["get"]>>["data"]>

export type ListedDomainData = ListBody["domains"][number]

export type DomainStatus = ListedDomainData["status"]

export type DomainCounts = ListBody["counts"]

/**
 * The two dates a proof page states. Derived across a domain's claims and never stored, so
 * neither can disagree with the claims it is read from.
 */
export type Proof = {
  readonly firstVerifiedAt: string
  readonly lastConfirmedAt: string
}

export type DomainActions = {
  /** Opens a claim: mints the token and starts the verification behind it. */
  readonly claim: () => Promise<ClaimDetail>
  readonly claims: () => Promise<readonly Claim[]>
  readonly archive: () => Promise<Domain>
  /** Puts an archived name back on the list, with every claim it ever carried. */
  readonly unarchive: () => Promise<Domain>
  /** The only eraser. Claims, verifications and proof links go with it. */
  readonly delete: () => Promise<void>
  /** Proved on the first date, most recently on the second. Null until something proves it. */
  readonly proof: () => Promise<Proof | null>
  readonly refresh: () => Promise<Domain>
}

export type Domain = DomainData & DomainActions

/** A domain as the list renders it: the name, plus where the claim in play on it stands. */
export type ListedDomain = ListedDomainData & DomainActions

export type DomainQuery = {
  /** Narrows to one name, in punycode. The way a page reads a domain it knows by name. */
  readonly name?: string
  readonly status?: DomainStatus
  /** Browses the archived shelf instead of the list. A `name` finds its domain either way. */
  readonly archived?: boolean
  /** The `nextCursor` of the page before this one. Absent asks for the first. */
  readonly cursor?: string
  readonly limit?: number
}

export type DomainPage = {
  readonly domains: readonly ListedDomain[]
  /** Every status on the account, not only the ones this page happens to carry. */
  readonly counts: DomainCounts
  readonly nextCursor: string | null
}

export type Domains = {
  /** Idempotent on the name: asking twice returns the same domain. */
  readonly findOrCreate: (name: string) => Promise<Domain>
  readonly get: (domainId: string) => Promise<Domain>
  readonly list: (query?: DomainQuery) => Promise<DomainPage>
}

export function domains(api: Treaty): Domains {
  return {
    findOrCreate: async (name) => asDomain(api, await unwrap(api.domains.post({ domain: name }))),
    get: (domainId) => readDomain(api, domainId),
    list: async (query = {}) => {
      const page = await unwrap(api.domains.get({ query }))

      return {
        domains: page.domains.map((domain) => asDomain(api, domain)),
        counts: page.counts,
        nextCursor: page.nextCursor,
      }
    },
  }
}

async function readDomain(api: Treaty, domainId: string): Promise<Domain> {
  return asDomain(api, await unwrap(api.domains({ id: domainId }).get()))
}

function asDomain<Data extends DomainData>(api: Treaty, data: Data): Data & DomainActions {
  const claimsOn = async () =>
    (await unwrap(api.claims.get({ query: { domainId: data.id } }))).claims

  return {
    ...data,
    claim: () => createClaim(api, data.id),
    claims: async () => (await claimsOn()).map((claim) => asClaim(api, claim)),
    proof: async () => proofOf(await claimsOn()),
    archive: async () => asDomain(api, await unwrap(api.domains({ id: data.id }).archive.post())),
    unarchive: async () =>
      asDomain(api, await unwrap(api.domains({ id: data.id }).unarchive.post())),
    delete: () => expectNoContent(api.domains({ id: data.id }).delete()),
    refresh: () => readDomain(api, data.id),
  }
}

/** ISO-8601 sorts lexicographically, so the earliest and the latest need no parsing. */
export function proofOf(claims: readonly ClaimData[]): Proof | null {
  const dated = claims.flatMap((claim) =>
    claim.state === "proved" && claim.endedAt !== null ? [claim.endedAt] : [],
  )
  if (dated.length === 0) return null

  return {
    firstVerifiedAt: dated.reduce((found, date) => (date < found ? date : found)),
    lastConfirmedAt: dated.reduce((found, date) => (date > found ? date : found)),
  }
}
