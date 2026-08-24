import type { AnsweredDns, RecordType } from "./dns.ts"
import { type DomainName, zoneCandidates } from "./domain-name.ts"
import type { DnsResolver } from "./ports.ts"

export type Delegation =
  | {
      readonly type: "delegated"
      readonly zoneName: string
      readonly nameservers: readonly [string, ...string[]]
      readonly answer: AnsweredDns
    }
  | { readonly type: "not_delegated" }
  | { readonly type: "unreachable" }

export type ResolveDns = (
  name: string,
  type: RecordType,
  signal?: AbortSignal,
) => Promise<AnsweredDns | null>

export function withFailover(resolvers: readonly DnsResolver[]): ResolveDns {
  return async (name, type, signal) => {
    for (const resolver of resolvers) {
      const answer = await resolver.query(name, type, signal)
      if (answer.type === "answered") return answer
    }
    return null
  }
}

export type FindDelegation = (domain: DomainName, signal?: AbortSignal) => Promise<Delegation>

export function createFindDelegation(resolve: ResolveDns): FindDelegation {
  return async (domain, signal) => {
    let anyResolverAnswered = false

    for (const zoneName of zoneCandidates(domain)) {
      const answer = await resolve(zoneName, "NS", signal)
      if (answer === null) continue
      anyResolverAnswered = true

      const [first, ...rest] = answer.records
        .filter((record) => record.type === "NS")
        .map((record) => record.data)

      if (first !== undefined) {
        return { type: "delegated", zoneName, nameservers: [first, ...rest], answer }
      }
    }

    return anyResolverAnswered ? { type: "not_delegated" } : { type: "unreachable" }
  }
}
