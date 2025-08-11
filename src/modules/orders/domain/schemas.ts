import { z } from 'zod';

export const CreateQuoteRequestSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  shipTo: z.object({ lat: z.number(), lng: z.number() }),
});
export type CreateQuoteRequest = z.infer<typeof CreateQuoteRequestSchema>;

export const QuoteReason = z.enum(['INSUFFICIENT_STOCK', 'SHIPPING_EXCEEDS_15_PERCENT']);
export type QuoteReason = z.infer<typeof QuoteReason>;

export const AllocationItemSchema = z.object({
  warehouseId: z.uuid(),
  name: z.string(),
  quantity: z.number().int().min(1),
  distanceKm: z.number(),
  shippingCents: z.number().int().min(0),
});
export type AllocationItem = z.infer<typeof AllocationItemSchema>;

export const QuoteResponseSchema = z.object({
  ruleSetId: z.string(),
  input: CreateQuoteRequestSchema,
  totals: z.object({
    unitPriceCents: z.number().int().min(0),
    subtotalCents: z.number().int().min(0),
    discountPct: z.number().int().min(0).max(100),
    discountCents: z.number().int().min(0),
    shippingCents: z.number().int().min(0),
    totalCents: z.number().int().min(0),
    shippingRatio: z.number().min(0),
    valid: z.boolean(),
    reason: QuoteReason.optional(),
  }),
  allocation: z.object({
    items: z.array(AllocationItemSchema),
    unallocated: z.number().int().min(0),
  }),
});
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
