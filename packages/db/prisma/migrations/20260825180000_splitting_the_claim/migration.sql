-- better-auth's table gives up the name, so `Verification` can mean the product's.
ALTER TABLE "Verification" RENAME TO "AuthVerification";
ALTER TABLE "AuthVerification" RENAME CONSTRAINT "Verification_pkey" TO "AuthVerification_pkey";
ALTER INDEX "Verification_identifier_idx" RENAME TO "AuthVerification_identifier_idx";

ALTER TABLE "SentNotice" RENAME TO "ClaimNotice";
ALTER TABLE "ClaimNotice" RENAME CONSTRAINT "SentNotice_pkey" TO "ClaimNotice_pkey";
ALTER TABLE "ClaimNotice" RENAME CONSTRAINT "SentNotice_claimId_fkey" TO "ClaimNotice_claimId_fkey";
ALTER INDEX "SentNotice_claimId_notice_sentAt_idx" RENAME TO "ClaimNotice_claimId_notice_sentAt_idx";

ALTER TYPE "CheckOutcome" RENAME TO "AttemptOutcome";

CREATE TYPE "VerificationMethod" AS ENUM ('DNS_TXT');
CREATE TYPE "VerificationStatus" AS ENUM ('RUNNING', 'PROVED', 'EXHAUSTED', 'STOPPED');
CREATE TYPE "AttemptTrigger" AS ENUM ('FIRST_CHECK', 'SCHEDULED', 'REQUESTED');

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "nextRunAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastOutcome" "AttemptOutcome",
    "lastRunAt" TIMESTAMP(3),
    "lastDiagnosis" JSONB,
    "waitReason" "WaitReason",
    "waitSecondsRemaining" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Verification_claimId_key" ON "Verification"("claimId");
CREATE INDEX "Verification_status_nextRunAt_idx" ON "Verification"("status", "nextRunAt");

ALTER TABLE "Verification" ADD CONSTRAINT "Verification_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "trigger" "AttemptTrigger" NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL,
    "diagnosis" JSONB,
    "evidence" JSONB,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationAttempt_verificationId_createdAt_idx"
  ON "VerificationAttempt"("verificationId", "createdAt");

ALTER TABLE "VerificationAttempt" ADD CONSTRAINT "VerificationAttempt_verificationId_fkey"
  FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The seven columns move rather than vanish: every claim that ever ran carries its
-- process forward, and the attempts table starts empty because there was nowhere to
-- write one before.
INSERT INTO "Verification" (
    "id", "claimId", "method", "status", "deadline", "nextRunAt", "consecutiveFailures",
    "lastOutcome", "lastRunAt", "lastDiagnosis", "waitReason", "waitSecondsRemaining", "createdAt"
)
SELECT
    'vrf_' || replace(gen_random_uuid()::text, '-', ''),
    "id",
    'DNS_TXT',
    CASE "state"
        WHEN 'PENDING' THEN 'RUNNING'::"VerificationStatus"
        WHEN 'PROVED' THEN 'PROVED'::"VerificationStatus"
        WHEN 'EXPIRED' THEN 'EXHAUSTED'::"VerificationStatus"
        ELSE 'STOPPED'::"VerificationStatus"
    END,
    "expiresAt",
    CASE WHEN "state" = 'PENDING' THEN "nextCheckAt" ELSE NULL END,
    "consecutiveFailures",
    "lastCheckOutcome",
    "lastCheckAt",
    "lastDiagnosis",
    "waitReason",
    "waitSecondsRemaining",
    "createdAt"
FROM "Claim";

ALTER TABLE "Claim"
  DROP COLUMN "nextCheckAt",
  DROP COLUMN "consecutiveFailures",
  DROP COLUMN "waitReason",
  DROP COLUMN "waitSecondsRemaining",
  DROP COLUMN "lastCheckOutcome",
  DROP COLUMN "lastCheckAt",
  DROP COLUMN "lastDiagnosis";

DROP INDEX IF EXISTS "Claim_state_nextCheckAt_idx";
CREATE INDEX "Claim_userId_state_idx" ON "Claim"("userId", "state");
