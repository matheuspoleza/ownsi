-- CreateEnum
CREATE TYPE "ClaimState" AS ENUM ('PENDING', 'PROVED', 'EXPIRED', 'DORMANT', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "domainAscii" TEXT NOT NULL,
    "state" "ClaimState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Claim_domainAscii_key" ON "Claim"("domainAscii");
