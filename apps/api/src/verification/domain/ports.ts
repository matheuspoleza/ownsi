export type ZoneFacts =
  | {
      readonly type: "answering"
      readonly nameservers: readonly string[]
      readonly negativeCacheTtlSeconds: number | null
    }
  | { readonly type: "unknown" }

export type ReadZoneFacts = (domain: string, signal?: AbortSignal) => Promise<ZoneFacts>
