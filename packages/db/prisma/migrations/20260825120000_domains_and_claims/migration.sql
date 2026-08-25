-- The pre-refactor Claim was keyed by name and carried no account and no token, so
-- nothing in it can be carried into the tables below.
DROP TABLE "Claim";
DROP TYPE "ClaimState";

-- CreateEnum
CREATE TYPE "ClaimState" AS ENUM ('PENDING', 'PROVED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CheckOutcome" AS ENUM ('FOUND', 'ABSENT', 'UNRESOLVABLE');

-- CreateEnum
CREATE TYPE "WaitReason" AS ENUM ('FIRST_CHECK', 'NEGATIVE_CACHE', 'PROVIDER_PUBLISHING');

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameAscii" TEXT NOT NULL,
    "nameUnicode" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "domainId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "state" "ClaimState" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "waitReason" "WaitReason",
    "waitSecondsRemaining" INTEGER,
    "lastCheckOutcome" "CheckOutcome",
    "lastCheckAt" TIMESTAMP(3),
    "lastDiagnosis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Domain_nameAscii_idx" ON "Domain"("nameAscii");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_userId_nameAscii_key" ON "Domain"("userId", "nameAscii");

-- CreateIndex
CREATE INDEX "Claim_domainId_sequence_idx" ON "Claim"("domainId", "sequence");

-- CreateIndex
CREATE INDEX "Claim_state_expiresAt_idx" ON "Claim"("state", "expiresAt");

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
