import type { Database } from "../../shared/database.ts"
import { randomId } from "../../shared/identifiers.ts"
import type { NoticeKind } from "../domain/notice.ts"
import type { SentNotices } from "../domain/ports.ts"

type NoticeRow = "OPENED" | "PROVED" | "PROGRESS" | "NUDGE" | "EXPIRING" | "EXPIRED" | "COEXISTENCE"

const NOTICE_ROW: Record<NoticeKind, NoticeRow> = {
  opened: "OPENED",
  proved: "PROVED",
  progress: "PROGRESS",
  nudge: "NUDGE",
  expiring: "EXPIRING",
  expired: "EXPIRED",
  coexistence: "COEXISTENCE",
}

export function postgresClaimNotices(database: Database): SentNotices {
  return {
    async lastSent(claimId, kind) {
      const row = await database.claimNotice.findFirst({
        where: { claimId, notice: NOTICE_ROW[kind] },
        orderBy: { sentAt: "desc" },
      })

      return row?.sentAt ?? null
    },

    async record(claimId, kind, at) {
      await database.claimNotice.create({
        data: { id: randomId("ntc"), claimId, notice: NOTICE_ROW[kind], sentAt: at },
      })
    },
  }
}
