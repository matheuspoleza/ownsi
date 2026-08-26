import type { Database } from "../../shared/database.ts"
import type { ProofLinkRepository } from "../domain/ports.ts"
import type { ProofLink } from "../domain/proof-link.ts"

type Row = {
  readonly slug: string
  readonly claimId: string
  readonly domainAscii: string
  readonly domainUnicode: string
  readonly heldBy: string
  readonly token: string
  readonly challengeHost: string
  readonly provider: string | null
  readonly provedAt: Date
  readonly issuedAt: Date
  readonly revokedAt: Date | null
}

export function postgresProofLinkRepository(database: Database): ProofLinkRepository {
  return {
    findBySlug: async (slug) => {
      const row = await database.proofLink.findUnique({ where: { slug } })
      return row === null ? null : toProofLink(row)
    },
    listByClaim: async (claimId) => {
      const rows = await database.proofLink.findMany({
        where: { claimId },
        orderBy: { issuedAt: "desc" },
      })
      return rows.map(toProofLink)
    },
    save: async (link) => {
      const row = toRow(link)
      await database.proofLink.upsert({ where: { slug: link.slug }, create: row, update: row })
    },
  }
}

function toProofLink(row: Row): ProofLink {
  return {
    slug: row.slug,
    claimId: row.claimId,
    attestation: {
      domain: row.domainAscii,
      unicodeDomain: row.domainUnicode,
      heldBy: row.heldBy,
      token: row.token,
      challengeHost: row.challengeHost,
      provider: row.provider,
      provedAt: row.provedAt,
    },
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt,
  }
}

function toRow(link: ProofLink): Row {
  return {
    slug: link.slug,
    claimId: link.claimId,
    domainAscii: link.attestation.domain,
    domainUnicode: link.attestation.unicodeDomain,
    heldBy: link.attestation.heldBy,
    token: link.attestation.token,
    challengeHost: link.attestation.challengeHost,
    provider: link.attestation.provider,
    provedAt: link.attestation.provedAt,
    issuedAt: link.issuedAt,
    revokedAt: link.revokedAt,
  }
}
