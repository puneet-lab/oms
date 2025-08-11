import { prisma } from '../../../common/prisma';
import { CreateOrderResponseSchema, type CreateOrderResponse } from '../domain/order';
import { Prisma } from '@prisma/client';

export async function findOrderSnapshotByIdempotencyKey(
  key: string,
): Promise<CreateOrderResponse | null> {
  const row = await prisma.order.findUnique({
    where: { idempotencyKey: key },
    include: { allocations: { include: { warehouse: { select: { name: true } } } } },
  });
  if (!row) return null;

  return CreateOrderResponseSchema.parse({
    orderId: row.id,
    ruleSetId: row.ruleSetId,
    totals: {
      unitPriceCents: row.unitPriceCents,
      subtotalCents: row.quantity * row.unitPriceCents,
      discountPct: row.discountPct,
      discountCents: row.discountCents,
      shippingCents: row.shippingCents,
      totalCents: row.totalCents,
    },
    allocation: {
      items: row.allocations.map((a) => ({
        warehouseId: a.warehouseId,
        name: a.warehouse.name,
        quantity: a.quantity,
        distanceKm: a.distanceKm,
        shippingCents: a.shippingCents,
      })),
    },
  });
}

type CreateArgs = {
  userId?: string;
  idempotencyKey: string;
  ruleSetId: string;
  request: { qty: number; lat: number; lng: number };
  totals: {
    unitPriceCents: number;
    discountPct: number;
    discountCents: number;
    shippingCents: number;
    totalCents: number;
  };
  allocation: Array<{
    warehouseId: string;
    name: string;
    quantity: number;
    distanceKm: number;
    shippingCents: number;
  }>;
};

export async function createOrderWithAllocations(args: CreateArgs): Promise<CreateOrderResponse> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        createdByUserId: args.userId,
        status: 'CREATED',
        quantity: args.request.qty,
        shipToLat: args.request.lat,
        shipToLng: args.request.lng,
        ruleSetId: args.ruleSetId,
        unitPriceCents: args.totals.unitPriceCents,
        discountPct: args.totals.discountPct,
        discountCents: args.totals.discountCents,
        shippingCents: args.totals.shippingCents,
        totalCents: args.totals.totalCents,
        idempotencyKey: args.idempotencyKey,
      },
    });

    for (const a of args.allocation) {
      await tx.orderAllocation.create({
        data: {
          orderId: order.id,
          warehouseId: a.warehouseId,
          quantity: a.quantity,
          distanceKm: a.distanceKm,
          shippingCents: a.shippingCents,
        },
      });

      const upd = await tx.warehouse.updateMany({
        where: { id: a.warehouseId, stockUnits: { gte: a.quantity } },
        data: { stockUnits: { decrement: a.quantity } },
      });
      if (upd.count !== 1) throw new Error('INSUFFICIENT_STOCK_CONCURRENT');
    }

    return {
      orderId: order.id,
      ruleSetId: order.ruleSetId,
      totals: {
        unitPriceCents: order.unitPriceCents,
        subtotalCents: args.request.qty * order.unitPriceCents,
        discountPct: order.discountPct,
        discountCents: order.discountCents,
        shippingCents: order.shippingCents,
        totalCents: order.totalCents,
      },
      allocation: { items: args.allocation },
    };
  });

  return CreateOrderResponseSchema.parse(result);
}

export type OrderWithAllocs = Prisma.OrderGetPayload<{
  include: { allocations: { include: { warehouse: { select: { name: true } } } } };
}>;
