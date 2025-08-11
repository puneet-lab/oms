import { z } from 'zod';

export const CreateOrderRequestSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  shipTo: z.object({ lat: z.number(), lng: z.number() }),
  clientRef: z.string().max(120).optional(),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

// Idempotency header (lowercase in Node)
export const IdempotencyHeaderSchema = z.object({
  'idempotency-key': z.string().min(1),
});
export type IdempotencyHeader = z.infer<typeof IdempotencyHeaderSchema>;

export const CreateOrderResponseSchema = z.object({
  orderId: z.uuid(),
  ruleSetId: z.uuid(),
  totals: z.object({
    unitPriceCents: z.number().int().min(0),
    subtotalCents: z.number().int().min(0),
    discountPct: z.number().int().min(0).max(100),
    discountCents: z.number().int().min(0),
    shippingCents: z.number().int().min(0),
    totalCents: z.number().int().min(0),
  }),
  allocation: z.object({
    items: z.array(
      z.object({
        warehouseId: z.uuid(),
        name: z.string(),
        quantity: z.number().int().min(1),
        distanceKm: z.number(),
        shippingCents: z.number().int().min(0),
      }),
    ),
  }),
});
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;
