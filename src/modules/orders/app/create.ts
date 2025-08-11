// src/modules/orders/app/create.ts
import type { CreateOrderRequest } from '../domain/order'; // or "../domain/order.schemas" if that's your path
import { CachedRulesProvider } from '../../pricing/app/cache';
import { allocateNearest } from '../domain/allocation';

import { HttpError } from '../../../common/errors';

import { computeTotals } from '../../pricing/domain/pricing';
import {
  createOrderWithAllocations,
  findOrderSnapshotByIdempotencyKey,
} from '../infra/orders.repo';
import { loadAllWarehouses } from '../infra/warehouses.repo';

export class CreateOrderService {
  constructor(private rules = new CachedRulesProvider()) {}

  async execute(req: CreateOrderRequest, idempotencyKey: string, userId?: string) {
    // 1) Idempotency replay
    const replay = await findOrderSnapshotByIdempotencyKey(idempotencyKey);
    if (replay) return { replay: true, ...replay };

    // 2) Active ruleset
    const ruleSet = await this.rules.getActive(new Date());
    if (!ruleSet) throw new HttpError(503, 'NO_ACTIVE_RULESET', 'No active pricing ruleset');

    // 3) Read warehouses → allocate → compute totals (shared domain helpers)
    const warehouses = await loadAllWarehouses();

    const allocation = allocateNearest({
      qty: req.quantity,
      shipTo: req.shipTo,
      warehouses,
      rules: {
        unitWeightKg: ruleSet.unitWeightKg,
        shipRatePerKgKm: ruleSet.shipRatePerKgKm,
      },
    });

    const shippingCents = allocation.items.reduce((s, a) => s + a.shippingCents, 0);

    const totals = computeTotals({
      qty: req.quantity,
      unitPriceCents: ruleSet.unitPriceCents,
      tiers: ruleSet.tiers,
      shippingCents,
      shippingMaxRatio: ruleSet.shippingMaxRatio,
      unallocated: allocation.unallocated,
    });

    if (!totals.valid) {
      const code =
        totals.reason === 'INSUFFICIENT_STOCK'
          ? 'INSUFFICIENT_STOCK'
          : 'SHIPPING_EXCEEDS_15_PERCENT';
      throw new HttpError(
        409,
        code,
        code === 'INSUFFICIENT_STOCK'
          ? 'Insufficient stock to fulfill order'
          : 'Shipping cost exceeds allowed ratio',
      );
    }

    // 4) Persist (transaction inside adapter) & return snapshot
    const snapshot = await createOrderWithAllocations({
      userId,
      idempotencyKey,
      ruleSetId: ruleSet.id,
      request: { qty: req.quantity, lat: req.shipTo.lat, lng: req.shipTo.lng },
      totals: {
        unitPriceCents: totals.unitPriceCents,
        discountPct: totals.discountPct,
        discountCents: totals.discountCents,
        shippingCents: totals.shippingCents,
        totalCents: totals.totalCents,
      },
      allocation: allocation.items,
    });

    return { replay: false, ...snapshot };
  }
}
