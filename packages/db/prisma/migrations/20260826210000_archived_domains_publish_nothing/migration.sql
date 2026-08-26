-- Archiving a domain now takes back every link published from it. Domains archived before
-- that was true left their links resolving, and the record has to agree with the reader:
-- the page refuses them either way, so the standing is what is out of date.

UPDATE "ProofLink"
   SET "revokedAt" = "Domain"."archivedAt"
  FROM "Claim", "Domain"
 WHERE "ProofLink"."claimId" = "Claim"."id"
   AND "Claim"."domainId" = "Domain"."id"
   AND "Domain"."archivedAt" IS NOT NULL
   AND "ProofLink"."revokedAt" IS NULL;
