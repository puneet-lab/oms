import { z } from 'zod';

export const DiscountTierInputSchema = z.object({
  threshold: z.number().int().min(1),
  pct: z.number().int().min(0).max(100),
  priority: z.number().int().min(0).default(0),
});
export type DiscountTierInput = z.infer<typeof DiscountTierInputSchema>;

export const CreateRuleSetSchema = z.object({
  name: z.string().min(1),
  effectiveFrom: z.coerce.date().default(() => new Date()),
  unitPriceCents: z.number().int().min(0),
  unitWeightKg: z.number().positive(),
  shipRatePerKgKm: z.number().min(0),
  shippingMaxRatio: z.number().min(0).max(1),
});
export type CreateRuleSet = z.infer<typeof CreateRuleSetSchema>;

export const ReplaceTiersSchema = z.object({
  tiers: z.array(DiscountTierInputSchema).min(1),
});
export type ReplaceTiers = z.infer<typeof ReplaceTiersSchema>;
