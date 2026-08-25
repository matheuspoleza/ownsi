import { asClaim, type Claim, type ClaimData, type ClaimDetail, createClaim } from "./claims.ts"
import { expectNoContent, type Treaty, unwrap } from "./client.ts"

export type DomainData = NonNullable<
  Awaited<ReturnType<ReturnType<Treaty["domains"]>["get"]>>["data"]
>

/**
 * The two dates a proof page states. Derived across a domain's claims and never stored, so
 * neither can disagree with the claims it is read from.
 */
export type Proof = {
  readonly firstVerifiedAt: string
  readonly lastConfirmedAt: string
}

export type Domain = DomainData & {
  /** Opens a claim: mints the token and starts the verification behind it. */
  readonly claim: () => Promise<ClaimDetail>
  readonly claims: () => Promise<readonly Claim[]>
  readonly archive: () => Promise<Domain>
  /** The only eraser. Claims, verifications and proof links go with it. */
  readonly delete: () => Promise<void>
  /** Proved on the first date, most recently on the second. Null until something proves it. */
  readonly proof: () => Promise<Proof | null>
  readonly refresh: () => Promise<Domain>
}

export type Domains = {
  /** Idempotent on the name: asking twice returns the same domain. */
  readonly findOrCreate: (name: string) => Promise<Domain>
  readonly get: (domainId: string) => Promise<Domain>
  readonly list: () => Promise<readonly Domain[]>
}

export function domains(api: Treaty): Domains {
  return {
    findOrCreate: async (name) => asDomain(api, await unwrap(api.domains.post({ domain: name }))),
    get: (domainId) => readDomain(api, domainId),
    list: async () => {
      const { domains: owned } = await unwrap(api.domains.get())
      return owned.map((domain) => asDomain(api, domain))
    },
  }
}

async function readDomain(api: Treaty, domainId: string): Promise<Domain> {
  return asDomain(api, await unwrap(api.domains({ id: domainId }).get()))
}

function asDomain(api: Treaty, data: DomainData): Domain {
  const claimsOn = async () =>
    (await unwrap(api.claims.get({ query: { domainId: data.id } }))).claims

  return {
    ...data,
    claim: () => createClaim(api, data.id),
    claims: async () => (await claimsOn()).map((claim) => asClaim(api, claim)),
    proof: async () => proofOf(await claimsOn()),
    archive: async () => asDomain(api, await unwrap(api.domains({ id: data.id }).archive.post())),
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
