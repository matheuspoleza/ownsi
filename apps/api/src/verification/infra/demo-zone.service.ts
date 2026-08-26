import type { Database } from "../../shared/database.ts"
import { demoDomainOf, isDemoName, type ReadPendingTokens } from "../domain/demo-zone.ts"
import type { HostRecords, ResolverReading } from "../domain/methods/txt/observation.ts"
import type { LookupTxt } from "../domain/methods/txt/ports.ts"

export type DemoZoneDeps = {
  readonly readPendingTokens: ReadPendingTokens
  readonly resolvers: readonly string[]
  readonly elsewhere: LookupTxt
}

export function demoZoneTxtLookup(deps: DemoZoneDeps): LookupTxt {
  return async (name, signal) => {
    if (!isDemoName(name)) return deps.elsewhere(name, signal)

    const domain = demoDomainOf(name)
    const txt = domain === null ? [] : await deps.readPendingTokens(domain)

    return deps.resolvers.map(
      (resolver): ResolverReading => ({
        resolver,
        type: "answered",
        records: recordsAt(name, txt),
      }),
    )
  }
}

export function pendingTokensIn(database: Database): ReadPendingTokens {
  return async (domain) => {
    const rows = await database.verification.findMany({
      where: { status: "RUNNING", challenge: { path: ["domain"], equals: domain } },
      select: { challenge: true },
    })

    return rows
      .map((row) => (row.challenge as { token?: string } | null)?.token ?? "")
      .filter((token) => token !== "")
  }
}

function recordsAt(name: string, txt: readonly string[]): HostRecords {
  return {
    name,
    presence: txt.length > 0 ? "present" : "nxdomain",
    txt,
    cname: null,
    otherTypes: [],
  }
}
