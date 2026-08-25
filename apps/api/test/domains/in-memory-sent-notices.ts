import type { SentNotices } from "../../src/domains/domain/ports.ts"
import type { NoticeKind } from "../../src/domains/domain/schedule.ts"

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
