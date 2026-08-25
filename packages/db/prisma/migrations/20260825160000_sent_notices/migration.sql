-- CreateEnum
CREATE TYPE "NoticeKind" AS ENUM ('PROVED', 'NUDGE', 'EXPIRING', 'COEXISTENCE');

-- CreateTable
CREATE TABLE "SentNotice" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "notice" "NoticeKind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentNotice_claimId_notice_sentAt_idx" ON "SentNotice"("claimId", "notice", "sentAt");

-- AddForeignKey
ALTER TABLE "SentNotice" ADD CONSTRAINT "SentNotice_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
