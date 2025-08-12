import { Prisma } from '@prisma/client';
import { prisma } from '../../../common/prisma';
import { HttpError } from '../../../common/errors';
import { z } from 'zod';

export const AllocationRowSchema = z.object({
  warehouseId: z.uuid(),
  quantity: z.number().int().min(1),
  shippingCents: z.number().int().min(0),
  distanceKm: z.number(),
});

const TotalsSchema = z.object({
  unitPriceCents: z.number().int().min(0),
  subtotalCents: z.number().int().min(0),
  discountPct: z.number().int().min(0).max(100),
  discountCents: z.number().int().min(0),
  shippingCents: z.number().int().min(0),
  totalCents: z.number().int().min(0),
});

export const CreateOrderInputSchema = z.object({
  userId: z.string().optional(),
  idempotencyKey: z.string().min(1),
  ruleSetId: z.uuid(),
  request: z.object({
    qty: z.number().int().min(1),
    lat: z.number(),
    lng: z.number(),
  }),
  totals: TotalsSchema,
  allocation: z.array(AllocationRowSchema),
});

export const OrderSnapshotSchema = z.object({
  orderId: z.uuid(),
  createdAt: z.date(),
  ruleSetId: z.uuid(),
  request: z.object({
    qty: z.number().int().min(1),
    lat: z.number(),
    lng: z.number(),
  }),
  totals: TotalsSchema,
  allocation: z.array(AllocationRowSchema),
  replay: z.boolean().optional(),
});

/** ===== Inferred types from Zod ===== */
export type AllocationRow = z.infer<typeof AllocationRowSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
export type OrderSnapshot = z.infer<typeof OrderSnapshotSchema>;

/** ===== Queries ===== */
export async function findOrderSnapshotByIdempotencyKey(
  key: string,
): Promise<OrderSnapshot | null> {
  const order = await prisma.order.findUnique({
    where: { idempotencyKey: key },
    include: { allocations: true },
  });
  if (!order) return null;

  const snap = {
    orderId: order.id,
    createdAt: order.createdAt,
    ruleSetId: order.ruleSetId,
    request: {
      qty: order.quantity,
      lat: order.shipToLat,
      lng: order.shipToLng,
    },
    totals: {
      unitPriceCents: order.unitPriceCents,
      subtotalCents: order.unitPriceCents * order.quantity - order.discountCents,
      discountPct: order.discountPct,
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
    },
    allocation: order.allocations.map((a) => ({
      warehouseId: a.warehouseId,
      quantity: a.quantity,
      shippingCents: a.shippingCents,
      distanceKm: a.distanceKm,
    })),
  };

  return OrderSnapshotSchema.parse(snap);
}

/**
 * 1) Create Order first (locks unique idempotencyKey)
 * 2) Atomic decrements with WHERE stockUnits >= quantity
 * 3) Bulk create allocations
 * 4) Return validated snapshot
 * 5) If P2002 -> load existing + mark replay:true
 */
export async function createOrderWithAllocations(
  inputRaw: CreateOrderInput,
): Promise<OrderSnapshot> {
  const input = CreateOrderInputSchema.parse(inputRaw);

  try {
    const snapshot = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          createdByUserId: input.userId ?? null,
          status: 'CREATED',

          // request snapshot
          quantity: input.request.qty,
          shipToLat: input.request.lat,
          shipToLng: input.request.lng,

          // pricing snapshot (DB does not have subtotalCents — that's fine)
          ruleSetId: input.ruleSetId,
          unitPriceCents: input.totals.unitPriceCents,
          discountPct: input.totals.discountPct,
          discountCents: input.totals.discountCents,
          shippingCents: input.totals.shippingCents,
          totalCents: input.totals.totalCents,
        },
      });

      for (const it of input.allocation) {
        const updated = await tx.warehouse.updateMany({
          where: { id: it.warehouseId, stockUnits: { gte: it.quantity } },
          data: { stockUnits: { decrement: it.quantity } },
        });
        if (updated.count === 0) {
          throw new HttpError(409, 'INSUFFICIENT_STOCK', 'Insufficient stock during allocation', {
            warehouseId: it.warehouseId,
            requested: it.quantity,
          });
        }
      }

      if (input.allocation.length) {
        await tx.orderAllocation.createMany({
          data: input.allocation.map((a) => ({
            orderId: order.id,
            warehouseId: a.warehouseId,
            quantity: a.quantity,
            distanceKm: a.distanceKm,
            shippingCents: a.shippingCents,
          })),
        });
      }

      const out = {
        orderId: order.id,
        createdAt: order.createdAt,
        ruleSetId: input.ruleSetId,
        request: input.request,
        totals: {
          unitPriceCents: input.totals.unitPriceCents,
          subtotalCents: input.totals.subtotalCents, // validated by Zod
          discountPct: input.totals.discountPct,
          discountCents: input.totals.discountCents,
          shippingCents: input.totals.shippingCents,
          totalCents: input.totals.totalCents,
        },
        allocation: input.allocation,
      };

      return OrderSnapshotSchema.parse(out);
    });

    return snapshot;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const snap = await findOrderSnapshotByIdempotencyKey(input.idempotencyKey);
      if (snap) return OrderSnapshotSchema.parse({ ...snap, replay: true });
      throw new HttpError(400, 'DUPLICATE_IDEMPOTENCY_KEY', 'Duplicate idempotency key');
    }
    throw e;
  }
}
