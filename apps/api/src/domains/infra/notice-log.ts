import type { Database } from "../../shared/database.ts"
import { randomId } from "../../shared/identifiers.ts"
import type { SentNotices } from "../domain/ports.ts"
import type { NoticeKind } from "../domain/schedule.ts"

type NoticeRow = "PROVED" | "NUDGE" | "EXPIRING" | "COEXISTENCE"

const NOTICE_ROW: Record<NoticeKind, NoticeRow> = {
  proved: "PROVED",
  nudge: "NUDGE",
  expiring: "EXPIRING",
  coexistence: "COEXISTENCE",
}

export function postgresSentNotices(database: Database): SentNotices {
  return {
    async lastSent(claimId, kind) {
      const row = await database.sentNotice.findFirst({
        where: { claimId, notice: NOTICE_ROW[kind] },
        orderBy: { sentAt: "desc" },
      })

      return row?.sentAt ?? null
    },

    async record(claimId, kind, at) {
      await database.sentNotice.create({
        data: { id: randomId("ntc"), claimId, notice: NOTICE_ROW[kind], sentAt: at },
      })
    },
  }
}
