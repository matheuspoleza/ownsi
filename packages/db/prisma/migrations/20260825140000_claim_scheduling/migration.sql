-- DropIndex
DROP INDEX "Claim_state_expiresAt_idx";

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextCheckAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Claim_state_nextCheckAt_idx" ON "Claim"("state", "nextCheckAt");
