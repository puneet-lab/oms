-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('CREATED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "stockUnits" INTEGER NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdempotencyKey" (
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key","method","path")
);

-- CreateTable
CREATE TABLE "public"."PricingRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "unitWeightKg" DOUBLE PRECISION NOT NULL,
    "shipRatePerKgKm" DOUBLE PRECISION NOT NULL,
    "shippingMaxRatio" DOUBLE PRECISION NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscountTier" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "pct" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "DiscountTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'CREATED',
    "quantity" INTEGER NOT NULL,
    "shipToLat" DOUBLE PRECISION NOT NULL,
    "shipToLng" DOUBLE PRECISION NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderAllocation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "shippingCents" INTEGER NOT NULL,

    CONSTRAINT "OrderAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_name_key" ON "public"."Warehouse"("name");

-- CreateIndex
CREATE INDEX "Warehouse_name_idx" ON "public"."Warehouse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_orderId_key" ON "public"."IdempotencyKey"("orderId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "public"."IdempotencyKey"("createdAt");

-- CreateIndex
CREATE INDEX "PricingRuleSet_effectiveFrom_idx" ON "public"."PricingRuleSet"("effectiveFrom");

-- CreateIndex
CREATE INDEX "DiscountTier_ruleSetId_idx" ON "public"."DiscountTier"("ruleSetId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountTier_ruleSetId_threshold_key" ON "public"."DiscountTier"("ruleSetId", "threshold");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "public"."Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderAllocation_orderId_idx" ON "public"."OrderAllocation"("orderId");

-- CreateIndex
CREATE INDEX "OrderAllocation_warehouseId_idx" ON "public"."OrderAllocation"("warehouseId");

-- AddForeignKey
ALTER TABLE "public"."DiscountTier" ADD CONSTRAINT "DiscountTier_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."PricingRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderAllocation" ADD CONSTRAINT "OrderAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderAllocation" ADD CONSTRAINT "OrderAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
