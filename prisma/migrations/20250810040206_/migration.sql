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

-- CreateIndex
CREATE INDEX "PricingRuleSet_effectiveFrom_idx" ON "public"."PricingRuleSet"("effectiveFrom");

-- CreateIndex
CREATE INDEX "DiscountTier_ruleSetId_idx" ON "public"."DiscountTier"("ruleSetId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountTier_ruleSetId_threshold_key" ON "public"."DiscountTier"("ruleSetId", "threshold");

-- AddForeignKey
ALTER TABLE "public"."DiscountTier" ADD CONSTRAINT "DiscountTier_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "public"."PricingRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
