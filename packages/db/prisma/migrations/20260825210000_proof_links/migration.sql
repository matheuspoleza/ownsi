-- The share of a proof, not the proof itself. The attestation is copied onto the row: it
-- states a past moment, so nothing that changes later may reach it.
CREATE TABLE "ProofLink" (
    "slug" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "domainAscii" TEXT NOT NULL,
    "domainUnicode" TEXT NOT NULL,
    "heldBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "provedAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProofLink_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "ProofLink_claimId_issuedAt_idx" ON "ProofLink"("claimId", "issuedAt");

ALTER TABLE "ProofLink" ADD CONSTRAINT "ProofLink_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
