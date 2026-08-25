import type { ResolverReading } from "./observation.ts"

export type LookupTxt = (name: string, signal?: AbortSignal) => Promise<readonly ResolverReading[]>

export type AuthoritativeTxt =
  | {
      readonly type: "answered"
      readonly nameservers: readonly string[]
      readonly txt: readonly string[]
    }
  | { readonly type: "silent"; readonly nameservers: readonly string[] }
  | { readonly type: "unknown" }

export type AskAuthoritativeTxt = (
  name: string,
  nameservers: readonly string[],
  signal?: AbortSignal,
) => Promise<AuthoritativeTxt>
