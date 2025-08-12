process.env.NODE_ENV = 'test';

import request from 'supertest';
import { prisma } from '../../../src/common/prisma';
import type { Express } from 'express';

describe('POST /v1/orders/quotes', () => {
  let app: Express;
  const ADMIN = 'Bearer dummy.admin.tester';
  const SALES = 'Bearer dummy.sales.tester';

  beforeAll(async () => {
    // Import app AFTER setting NODE_ENV (same as working test)
    const { createApp } = await import('../../../src/app');
    app = createApp();

    // Clean up any existing test data first
    await prisma.discountTier.deleteMany({
      where: { ruleSet: { name: { startsWith: 'TEST-' } } },
    });
    await prisma.pricingRuleSet.deleteMany({
      where: { name: { startsWith: 'TEST-' } },
    });

    // Ensure at least one ruleset exists
    const rs = await prisma.pricingRuleSet.create({
      data: {
        name: 'TEST-RS-QUOTES',
        effectiveFrom: new Date(Date.now() - 1000),
        unitPriceCents: 15000,
        unitWeightKg: 0.365,
        shipRatePerKgKm: 0.01,
        shippingMaxRatio: 0.15,
      },
    });

    await prisma.discountTier.createMany({
      data: [
        { ruleSetId: rs.id, threshold: 25, pct: 5, priority: 1 },
        { ruleSetId: rs.id, threshold: 50, pct: 10, priority: 2 },
        { ruleSetId: rs.id, threshold: 100, pct: 15, priority: 3 },
        { ruleSetId: rs.id, threshold: 250, pct: 20, priority: 4 },
      ],
    });

    // Ensure at least one warehouse
    const existingWarehouse = await prisma.warehouse.findFirst();
    if (!existingWarehouse) {
      await prisma.warehouse.create({
        data: { name: 'TEST-W1', lat: 40.7, lng: -74.0, stockUnits: 1000 },
      });
    }
  });

  afterAll(async () => {
    // Clean up test data (same pattern as working test)
    await prisma.discountTier.deleteMany({
      where: { ruleSet: { name: { startsWith: 'TEST-' } } },
    });
    await prisma.pricingRuleSet.deleteMany({
      where: { name: { startsWith: 'TEST-' } },
    });
    await prisma.warehouse.deleteMany({
      where: { name: { startsWith: 'TEST-' } },
    });
    await prisma.$disconnect();
  });

  it('401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/orders/quotes')
      .send({ quantity: 1, shipTo: { lat: 40.71, lng: -74.0 } });
    expect(res.status).toBe(401);
  });

  it('403 for wrong role (none here since sales allowed) — sanity with sales', async () => {
    const res = await request(app)
      .post('/api/v1/orders/quotes')
      .set('Authorization', SALES)
      .send({ quantity: 2, shipTo: { lat: 40.71, lng: -74.0 } });
    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('x-rule-set-id');
    expect(res.body?.totals?.valid).toBeTypeOf('boolean');
  });

  it('422 on invalid body', async () => {
    const res = await request(app)
      .post('/api/v1/orders/quotes')
      .set('Authorization', ADMIN)
      .send({ quantity: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('200 valid quote', async () => {
    const res = await request(app)
      .post('/api/v1/orders/quotes')
      .set('Authorization', ADMIN)
      .send({ quantity: 10, shipTo: { lat: 40.71, lng: -74.0 } });
    expect(res.status).toBe(200);
    expect(res.body?.totals?.totalCents).toBeGreaterThan(0);
    expect(res.body?.totals?.valid).toBe(true);
  });

  it('200 invalid: insufficient stock', async () => {
    // drop all stock for a quick failure
    await prisma.warehouse.updateMany({ data: { stockUnits: 0 } });
    const res = await request(app)
      .post('/api/v1/orders/quotes')
      .set('Authorization', ADMIN)
      .send({ quantity: 5, shipTo: { lat: 40.71, lng: -74.0 } });
    expect(res.status).toBe(200);
    expect(res.body?.totals?.valid).toBe(false);
    expect(res.body?.totals?.reason).toBe('INSUFFICIENT_STOCK');

    // restore stock for subsequent tests
    await prisma.warehouse.updateMany({ data: { stockUnits: 1000 } });
  });
});
