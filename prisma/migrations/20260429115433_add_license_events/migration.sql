-- CreateTable
CREATE TABLE "LicenseEvent" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "message" TEXT,
    "domain" TEXT,
    "serverIp" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LicenseEvent_licenseId_idx" ON "LicenseEvent"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseEvent_eventType_idx" ON "LicenseEvent"("eventType");

-- CreateIndex
CREATE INDEX "LicenseEvent_actorType_idx" ON "LicenseEvent"("actorType");

-- CreateIndex
CREATE INDEX "LicenseEvent_createdAt_idx" ON "LicenseEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "LicenseEvent" ADD CONSTRAINT "LicenseEvent_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
