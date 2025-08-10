import type { CreateQuoteRequest, QuoteResponse } from '../domain/schemas';
import { haversineKm } from '../../shipping/app/distance';
import { CachedRulesProvider } from '../../pricing/app/cache';
import { prisma } from '../../../common/prisma';

type WarehouseRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stockUnits: number;
};

function calcDiscountPct(qty: number, tiers: Array<{ threshold: number; pct: number }>): number {
  for (const t of tiers) if (qty >= t.threshold) return t.pct;
  return 0;
}
const cents = (d: number) => Math.round(d * 100);

export class QuoteService {
  constructor(private rules = new CachedRulesProvider()) {}

  async execute(req: CreateQuoteRequest): Promise<QuoteResponse> {
    const ruleSet = await this.rules.getActive(new Date());
    if (!ruleSet)
      throw Object.assign(new Error('No active pricing ruleset'), {
        status: 503,
        code: 'NO_ACTIVE_RULESET',
      });

    const warehouses = (await prisma.warehouse.findMany({
      select: { id: true, name: true, lat: true, lng: true, stockUnits: true },
    })) as WarehouseRow[];

    // distances + greedy nearest-first allocation
    const enriched = warehouses
      .map((w) => ({
        ...w,
        distanceKm: haversineKm({ lat: w.lat, lng: w.lng }, req.shipTo),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    let remaining = req.quantity;
    const allocation: {
      warehouseId: string;
      name: string;
      quantity: number;
      distanceKm: number;
      shippingCents: number;
    }[] = [];

    for (const w of enriched) {
      if (remaining <= 0) break;
      const qty = Math.min(w.stockUnits, remaining);
      if (qty <= 0) continue;

      const weightKg = qty * ruleSet.unitWeightKg;
      const shipDollars = weightKg * w.distanceKm * ruleSet.shipRatePerKgKm;
      const shipCents = cents(shipDollars);

      allocation.push({
        warehouseId: w.id,
        name: w.name,
        quantity: qty,
        distanceKm: Math.round(w.distanceKm * 10) / 10,
        shippingCents: shipCents,
      });
      remaining -= qty;
    }

    const subtotalCents = req.quantity * ruleSet.unitPriceCents;
    const discountPct = calcDiscountPct(req.quantity, ruleSet.tiers);
    const discountCents = Math.round(subtotalCents * (discountPct / 100));
    const discountedCents = subtotalCents - discountCents;

    const shippingCents = allocation.reduce((s, a) => s + a.shippingCents, 0);
    const totalCents = discountedCents + shippingCents;
    const shippingRatio = discountedCents ? +(shippingCents / discountedCents).toFixed(4) : 0;

    let valid = true;
    let reason: 'INSUFFICIENT_STOCK' | 'SHIPPING_EXCEEDS_15_PERCENT' | undefined = undefined;

    if (remaining > 0) {
      valid = false;
      reason = 'INSUFFICIENT_STOCK';
    } else if (shippingCents > Math.floor(discountedCents * ruleSet.shippingMaxRatio + 1e-6)) {
      valid = false;
      reason = 'SHIPPING_EXCEEDS_15_PERCENT';
    }

    return {
      ruleSetId: ruleSet.id,
      input: req,
      totals: {
        unitPriceCents: ruleSet.unitPriceCents,
        subtotalCents,
        discountPct,
        discountCents,
        shippingCents,
        totalCents,
        shippingRatio,
        valid,
        reason,
      },
      allocation: {
        items: allocation,
        unallocated: remaining,
      },
    };
  }
}
