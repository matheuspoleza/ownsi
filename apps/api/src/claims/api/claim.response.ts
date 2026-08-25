import { type Static, t } from "elysia"
import type { ClaimDetail, ClaimView } from "../claims.contract.ts"
import { challengeRecords } from "../domain/challenge.ts"

const ChallengeRecordResponse = t.Object({
  host: t.String(),
  name: t.String(),
  type: t.Literal("TXT"),
  value: t.String(),
})

const CoexistenceResponse = t.Object({ maskedEmail: t.String(), provedAt: t.String() })

export const ClaimResponse = t.Object({
  id: t.String(),
  domainId: t.String(),
  domain: t.String(),
  unicodeDomain: t.String(),
  state: t.UnionEnum(["pending", "proved", "expired", "canceled"]),
  token: t.String(),
  records: t.Array(ChallengeRecordResponse),
  verificationId: t.Union([t.String(), t.Null()]),
  expiresAt: t.String(),
  endedAt: t.Union([t.String(), t.Null()]),
  createdAt: t.String(),
})

export const ClaimDetailResponse = t.Composite([
  ClaimResponse,
  t.Object({ coexistence: t.Union([CoexistenceResponse, t.Null()]) }),
])

export const ClaimListResponse = t.Object({ claims: t.Array(ClaimResponse) })

export function toClaimResponse({ claim, domain }: ClaimView): Static<typeof ClaimResponse> {
  return {
    id: claim.id,
    domainId: claim.domainId,
    domain: domain.nameAscii,
    unicodeDomain: domain.nameUnicode,
    state: claim.state,
    token: claim.token,
    records: [...challengeRecords(claim, domain.nameAscii)],
    verificationId: claim.verificationId,
    expiresAt: claim.expiresAt.toISOString(),
    endedAt: claim.state === "pending" ? null : claim.endedAt.toISOString(),
    createdAt: claim.createdAt.toISOString(),
  }
}

export function toClaimDetailResponse(view: ClaimDetail): Static<typeof ClaimDetailResponse> {
  return { ...toClaimResponse(view), coexistence: view.coexistence }
}

export function toClaimListResponse(views: readonly ClaimView[]): Static<typeof ClaimListResponse> {
  return { claims: views.map(toClaimResponse) }
}
