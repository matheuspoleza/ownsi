import type { HostRecords, ResolverReading } from "../domain/methods/txt/observation.ts"
import type {
  AskAuthoritativeTxt,
  AuthoritativeTxt,
  LookupTxt,
} from "../domain/methods/txt/ports.ts"

export type TxtFixtures = Record<string, Partial<HostRecords>>

const FAKE_RESOLVERS = ["google", "cloudflare", "quad9"]

export function fakeTxtLookup(fixtures: TxtFixtures, resolvers = FAKE_RESOLVERS): LookupTxt {
  return async (name) =>
    resolvers.map(
      (resolver): ResolverReading => ({
        resolver,
        type: "answered",
        records: recordsAt(name, fixtures[name]),
      }),
    )
}

export function unreachableTxtLookup(resolvers = FAKE_RESOLVERS): LookupTxt {
  return async () =>
    resolvers.map(
      (resolver): ResolverReading => ({
        resolver,
        type: "failed",
        failure: "unreachable",
      }),
    )
}

export function fakeAuthoritativeTxt(fixtures: TxtFixtures): AskAuthoritativeTxt {
  return async (name, nameservers): Promise<AuthoritativeTxt> => {
    if (nameservers.length === 0) return { type: "unknown" }

    return { type: "answered", nameservers, txt: fixtures[name]?.txt ?? [] }
  }
}

function recordsAt(name: string, fixture: Partial<HostRecords> | undefined): HostRecords {
  return {
    name,
    presence: fixture ? "present" : "nxdomain",
    txt: [],
    cname: null,
    otherTypes: [],
    ...fixture,
  }
}
