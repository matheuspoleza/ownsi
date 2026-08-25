-- A verification carries the challenge it must find, so a scheduled run needs no claim
-- in sight, and the account it belongs to, so a route can scope it without one either.
ALTER TABLE "Verification" ADD COLUMN "challenge" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Verification" ALTER COLUMN "challenge" DROP DEFAULT;

ALTER TABLE "Verification" ADD COLUMN "ownerId" TEXT;
UPDATE "Verification" SET "ownerId" = "Claim"."userId"
  FROM "Claim" WHERE "Claim"."id" = "Verification"."claimId";
DELETE FROM "Verification" WHERE "ownerId" IS NULL;
ALTER TABLE "Verification" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "Verification_ownerId_idx" ON "Verification"("ownerId");

-- The wait a screen renders is derived from the last diagnosis and the next run, never
-- stored, so it can never go stale.
ALTER TABLE "Verification" DROP COLUMN "waitReason";
ALTER TABLE "Verification" DROP COLUMN "waitSecondsRemaining";
DROP TYPE "WaitReason";

-- The claim keeps the receipt of the process it delegated to.
ALTER TABLE "Claim" ADD COLUMN "verificationId" TEXT;
UPDATE "Claim" SET "verificationId" = "Verification"."id"
  FROM "Verification" WHERE "Verification"."claimId" = "Claim"."id";
