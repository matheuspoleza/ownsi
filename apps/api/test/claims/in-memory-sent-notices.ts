import type { NoticeKind } from "../../src/claims/domain/notice.ts"
import type { SentNotices } from "../../src/claims/domain/ports.ts"

export function inMemorySentNotices(): SentNotices {
  const sent = new Map<string, Date>()
  const key = (claimId: string, kind: NoticeKind) => `${claimId}:${kind}`

  return {
    lastSent: async (claimId, kind) => sent.get(key(claimId, kind)) ?? null,
    record: async (claimId, kind, at) => {
      sent.set(key(claimId, kind), at)
    },
  }
}
