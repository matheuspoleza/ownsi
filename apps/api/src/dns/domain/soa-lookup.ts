import type { ResolveDns } from "./delegation.ts"
import type { AnsweredDns, DnsAnswer } from "./dns.ts"
import type { AskNameserver } from "./ports.ts"

const MAX_NAMESERVERS_ASKED = 3

export type ReadSoa = (
  zoneName: string,
  nameservers: readonly string[],
  signal?: AbortSignal,
) => Promise<AnsweredDns | null>

export function createReadSoa(deps: {
  readonly askNameserver: AskNameserver
  readonly resolve: ResolveDns
  readonly budgetMs: number
}): ReadSoa {
  return async (zoneName, nameservers, signal) => {
    const budget = AbortSignal.timeout(deps.budgetMs)
    const deadline = signal ? AbortSignal.any([signal, budget]) : budget

    const authoritative = await firstWithRecords(
      nameservers
        .slice(0, MAX_NAMESERVERS_ASKED)
        .map((nameserver) => deps.askNameserver(zoneName, "SOA", nameserver, deadline)),
    )
    if (authoritative) return authoritative

    return deps.resolve(zoneName, "SOA", deadline)
  }
}

async function firstWithRecords(
  queries: readonly Promise<DnsAnswer>[],
): Promise<AnsweredDns | null> {
  const pending = new Set(queries)

  while (pending.size > 0) {
    const { query, answer } = await Promise.race(
      [...pending].map((pendingQuery) =>
        pendingQuery.then((answer) => ({ query: pendingQuery, answer })),
      ),
    )
    pending.delete(query)

    if (answer.type === "answered" && answer.status === "NOERROR" && answer.records.length > 0) {
      return answer
    }
  }
  return null
}
