export type ZoneAuthority =
  | { readonly type: "answered"; readonly negativeCacheTtlSeconds: number }
  | { readonly type: "silent" }

export type ZoneUnreadable = "invalid_name" | "unreachable"

export type ZoneDescription =
  | {
      readonly type: "delegated"
      readonly zoneName: string
      readonly nameservers: readonly [string, ...string[]]
      readonly authority: ZoneAuthority
    }
  | { readonly type: "not_delegated"; readonly name: string }
  | { readonly type: "unreadable"; readonly reason: ZoneUnreadable }

export type DescribeZone = (name: string, signal?: AbortSignal) => Promise<ZoneDescription>
