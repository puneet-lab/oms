// tests/http/orders.stock-race.test.ts
process.env.NODE_ENV = 'test';

import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/common/prisma';

const ADMIN = 'Bearer dummy.admin.tester';

async function ensureRuleSet() {
  let rs = await prisma.pricingRuleSet.findFirst();
  if (!rs) {
    rs = await prisma.pricingRuleSet.create({
      data: {
        name: 'TEST-RS-RACE',
        effectiveFrom: new Date(Date.now() - 1000),
        unitPriceCents: 1000,
        unitWeightKg: 1,
        shipRatePerKgKm: 0.01,
        shippingMaxRatio: 0.15,
      },
    });
    await prisma.discountTier.create({
      data: { ruleSetId: rs.id, threshold: 1, pct: 0, priority: 1 },
    });
  }
}

describe('POST /api/v1/orders - stock race condition', () => {
  let app: Express;

  beforeAll(async () => {
    const { createApp } = await import('../../src/app');
    app = createApp();
    await ensureRuleSet();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('only one order succeeds when total demand equals stock (loser = INSUFFICIENT_STOCK)', async () => {
    const w = await prisma.warehouse.create({
      data: {
        name: `W-TEST-RACE-${Date.now()}`,
        lat: 12.34,
        lng: 56.78,
        stockUnits: 5,
      },
    });

    await prisma.warehouse.updateMany({
      where: { NOT: { id: w.id } },
      data: { stockUnits: 0 },
    });

    // Ship to the EXACT same coords so distance=0 → shippingCents=0 (no ratio issues)
    const body = { quantity: 5, shipTo: { lat: w.lat, lng: w.lng } };

    const reqA = request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', `race-${Date.now()}-A`)
      .send(body);

    const reqB = request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', `race-${Date.now()}-B`)
      .send(body);

    const [a, b] = await Promise.all([reqA, reqB]);
    const got = [a.status, b.status];

    // Order-agnostic: exactly one 201 and one 409
    expect(got.filter((s) => s === 201)).toHaveLength(1);
    expect(got.filter((s) => s === 409)).toHaveLength(1);

    const loser = a.status === 409 ? a : b;
    expect(loser.body?.error?.code).toBe('INSUFFICIENT_STOCK');

    // Winner consumed all 5 units; stock cannot go negative
    const refreshed = await prisma.warehouse.findUnique({ where: { id: w.id } });
    expect(refreshed?.stockUnits).toBe(0);
  });
});
