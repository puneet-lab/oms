// src/modules/orders/app/quote.ts

import { CachedRulesProvider } from '../../pricing/app/cache';
import { prisma } from '../../../common/prisma';
import { allocateNearest } from '../domain/allocation';
import { HttpError } from '../../../common/errors';
import { computeTotals } from '../../pricing/domain/pricing';
import { CreateQuoteRequest, QuoteResponse } from '../domain/quotes';

export class QuoteService {
  constructor(private rules = new CachedRulesProvider()) {}

  async execute(req: CreateQuoteRequest): Promise<QuoteResponse> {
    const ruleSet = await this.rules.getActive(new Date());
    if (!ruleSet) {
      throw new HttpError(503, 'NO_ACTIVE_RULESET', 'No active pricing ruleset');
    }

    const warehouses = await prisma.warehouse.findMany({
      select: { id: true, name: true, lat: true, lng: true, stockUnits: true },
    });

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

    return {
      ruleSetId: ruleSet.id,
      input: req,
      totals,
      allocation: {
        items: allocation.items,
        unallocated: allocation.unallocated,
      },
    };
  }
}
