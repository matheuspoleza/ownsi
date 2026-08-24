-- CreateTable
CREATE TABLE "Zone" (
    "requestedName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameservers" TEXT[],
    "provider" TEXT NOT NULL,
    "negativeCacheTtlSeconds" INTEGER,
    "serial" BIGINT,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("requestedName")
);

-- CreateIndex
CREATE INDEX "Zone_name_idx" ON "Zone"("name");

-- CreateIndex
CREATE INDEX "Zone_observedAt_idx" ON "Zone"("observedAt");
