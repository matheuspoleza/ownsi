-- A link shares something already proved, and nothing on the proved side of the claim
-- carries a clock. Expiry belonged to the claim that was never proved in time.

-- Links that had already stopped resolving stay stopped, now as what they always were
-- from a reader's side: taken back.
UPDATE "ProofLink"
   SET "revokedAt" = "expiresAt"
 WHERE "revokedAt" IS NULL
   AND "expiresAt" <= NOW();

ALTER TABLE "ProofLink" DROP COLUMN "expiresAt";
