import { asClaim, type Claim, type ClaimDetail, createClaim } from "./claims.ts"
import { expectNoContent, type Treaty, unwrap } from "./client.ts"

export type DomainData = NonNullable<
  Awaited<ReturnType<ReturnType<Treaty["domains"]>["get"]>>["data"]
>

export type Domain = DomainData & {
  /** Opens a claim: mints the token and starts the verification behind it. */
  readonly claim: () => Promise<ClaimDetail>
  readonly claims: () => Promise<readonly Claim[]>
  readonly archive: () => Promise<Domain>
  /** The only eraser. Claims, verifications and proof links go with it. */
  readonly delete: () => Promise<void>
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
  return {
    ...data,
    claim: () => createClaim(api, data.id),
    claims: async () => {
      const { claims } = await unwrap(api.claims.get({ query: { domainId: data.id } }))
      return claims.map((claim) => asClaim(api, claim))
    },
    archive: async () => asDomain(api, await unwrap(api.domains({ id: data.id }).archive.post())),
    delete: () => expectNoContent(api.domains({ id: data.id }).delete()),
    refresh: () => readDomain(api, data.id),
  }
}
