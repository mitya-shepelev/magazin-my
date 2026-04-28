-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT,
    "serverIp" TEXT,
    "maxActivations" INTEGER NOT NULL DEFAULT 1,
    "activationCount" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMP(3),
    "lastCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "License_orderItemId_key" ON "License"("orderItemId");

-- CreateIndex
CREATE INDEX "License_userId_idx" ON "License"("userId");

-- CreateIndex
CREATE INDEX "License_orderId_idx" ON "License"("orderId");

-- CreateIndex
CREATE INDEX "License_productId_idx" ON "License"("productId");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill licenses for already paid orders.
INSERT INTO "License" (
    "id",
    "licenseKey",
    "status",
    "orderId",
    "orderItemId",
    "productId",
    "userId",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('lic_', substr(md5(oi."id" || random()::text), 1, 24)),
    concat(
        'MY-',
        upper(substr(md5(oi."id" || o."id"), 1, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 5, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 9, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 13, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 17, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 21, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 25, 4)), '-',
        upper(substr(md5(oi."id" || o."id"), 29, 4))
    ),
    'ACTIVE',
    oi."orderId",
    oi."id",
    oi."productId",
    o."userId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "OrderItem" oi
JOIN "Order" o ON o."id" = oi."orderId"
WHERE o."status" = 'PAID'
ON CONFLICT ("orderItemId") DO NOTHING;
