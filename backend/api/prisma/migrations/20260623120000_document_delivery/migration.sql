-- CreateEnum
CREATE TYPE "DocumentDeliveryStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "DocumentDelivery" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "conversationId" TEXT,
    "caption" TEXT,
    "status" "DocumentDeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentDelivery_status_scheduledAt_idx" ON "DocumentDelivery"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "DocumentDelivery_documentId_idx" ON "DocumentDelivery"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
