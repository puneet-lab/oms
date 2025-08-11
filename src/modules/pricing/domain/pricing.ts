import { z } from 'zod';

export const DiscountTierSchema = z.object({
  threshold: z.number().int().min(1),
  pct: z.number().int().min(0).max(100),
});
export type DiscountTier = z.infer<typeof DiscountTierSchema>;

export const QuoteReason = z.enum(['INSUFFICIENT_STOCK', 'SHIPPING_EXCEEDS_15_PERCENT']);
export type QuoteReason = z.infer<typeof QuoteReason>;

export const TotalsInputSchema = z.object({
  qty: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  tiers: z.array(DiscountTierSchema),
  shippingCents: z.number().int().min(0),
  shippingMaxRatio: z.number().min(0).max(1),
  unallocated: z.number().int().min(0),
});
export type TotalsInput = z.infer<typeof TotalsInputSchema>;

export const TotalsResultSchema = z.object({
  unitPriceCents: z.number().int().min(0),
  subtotalCents: z.number().int().min(0),
  discountPct: z.number().int().min(0).max(100),
  discountCents: z.number().int().min(0),
  shippingCents: z.number().int().min(0),
  totalCents: z.number().int().min(0),
  shippingRatio: z.number().min(0),
  valid: z.boolean(),
  reason: QuoteReason.optional(),
});
export type TotalsResult = z.infer<typeof TotalsResultSchema>;

/** Helpers */
export function calcDiscountPct(qty: number, tiers: DiscountTier[]): number {
  for (const t of tiers) if (qty >= t.threshold) return t.pct;
  return 0;
}

/** Core pricing (validates input & output via Zod) */
export function computeTotals(raw: TotalsInput): TotalsResult {
  const args = TotalsInputSchema.parse(raw);

  const subtotalCents = args.qty * args.unitPriceCents;
  const discountPct = calcDiscountPct(args.qty, args.tiers);
  const discountCents = Math.round(subtotalCents * (discountPct / 100));
  const discountedCents = subtotalCents - discountCents;

  const shippingCents = args.shippingCents;
  const totalCents = discountedCents + shippingCents;
  const shippingRatio = discountedCents ? +(shippingCents / discountedCents).toFixed(4) : 0;

  let reason: QuoteReason | undefined;
  if (args.unallocated > 0) {
    reason = 'INSUFFICIENT_STOCK';
  } else if (shippingCents > Math.floor(discountedCents * args.shippingMaxRatio + 1e-6)) {
    reason = 'SHIPPING_EXCEEDS_15_PERCENT';
  }

  return TotalsResultSchema.parse({
    unitPriceCents: args.unitPriceCents,
    subtotalCents,
    discountPct,
    discountCents,
    shippingCents,
    totalCents,
    shippingRatio,
    valid: !reason,
    reason,
  });
}
