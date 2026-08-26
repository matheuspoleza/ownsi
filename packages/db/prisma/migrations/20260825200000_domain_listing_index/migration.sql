-- The dashboard pages by keyset on (createdAt, id) descending, so the list walks this
-- index backwards and stops at the page size instead of sorting the whole account.
CREATE INDEX "Domain_userId_createdAt_id_idx" ON "Domain"("userId", "createdAt", "id");
