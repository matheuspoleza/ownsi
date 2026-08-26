-- What the published page prints beside the date: the host the token was written on, so a
-- reader can run the lookup, and who served the zone when the link went out.
ALTER TABLE "ProofLink" ADD COLUMN "challengeHost" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProofLink" ALTER COLUMN "challengeHost" DROP DEFAULT;
ALTER TABLE "ProofLink" ADD COLUMN "provider" TEXT;
