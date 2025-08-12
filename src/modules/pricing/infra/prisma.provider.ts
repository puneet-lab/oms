import { prisma } from '../../../common/prisma';
import type { RuleSetDTO } from '../domain/provider';

export async function loadActiveRuleSet(now: Date): Promise<RuleSetDTO | null> {
  const rs = await prisma.pricingRuleSet.findFirst({
    where: { effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: 'desc' },
    include: { tiers: { orderBy: [{ priority: 'desc' }, { threshold: 'desc' }] } },
  });
  if (!rs) return null;
  return {
    id: rs.id,
    unitPriceCents: rs.unitPriceCents,
    unitWeightKg: rs.unitWeightKg,
    shipRatePerKgKm: rs.shipRatePerKgKm,
    shippingMaxRatio: rs.shippingMaxRatio,
    tiers: rs.tiers.map((t) => ({ threshold: t.threshold, pct: t.pct, priority: t.priority })),
  };
}
