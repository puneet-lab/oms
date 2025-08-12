process.env.NODE_ENV = 'test';

import request from 'supertest';
import { prisma } from '../../../src/common/prisma';
import type { Express } from 'express';

const ADMIN = 'Bearer dummy.admin.tester';

describe('POST /v1/orders', () => {
  let app: Express;

  beforeAll(async () => {
    const { createApp } = await import('../../../src/app');
    app = createApp();

    // ensure ruleset exists
    const rs = await prisma.pricingRuleSet.findFirst();
    if (!rs) {
      const created = await prisma.pricingRuleSet.create({
        data: {
          name: 'TEST-RS-ORDERS',
          effectiveFrom: new Date(Date.now() - 1000),
          unitPriceCents: 15000,
          unitWeightKg: 0.365,
          shipRatePerKgKm: 0.01,
          shippingMaxRatio: 0.15,
        },
      });
      await prisma.discountTier.createMany({
        data: [
          { ruleSetId: created.id, threshold: 25, pct: 5, priority: 1 },
          { ruleSetId: created.id, threshold: 50, pct: 10, priority: 2 },
          { ruleSetId: created.id, threshold: 100, pct: 15, priority: 3 },
          { ruleSetId: created.id, threshold: 250, pct: 20, priority: 4 },
        ],
      });
    }

    // ensure warehouses
    const wcount = await prisma.warehouse.count();
    if (wcount === 0) {
      await prisma.warehouse.createMany({
        data: [
          { name: 'W-NY', lat: 40.7, lng: -74.0, stockUnits: 1000 },
          { name: 'W-LA', lat: 34.05, lng: -118.25, stockUnits: 1000 },
        ],
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('422 without Idempotency-Key', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .send({ quantity: 2, shipTo: { lat: 40.71, lng: -74.0 } });
    expect(res.status).toBe(422);
  });

  it('201 creates order, decrements stock', async () => {
    const key = 'demo-key-1';
    const before = await prisma.warehouse.findMany({ select: { id: true, stockUnits: true } });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', key)
      .send({ quantity: 10, shipTo: { lat: 40.71, lng: -74.0 } });

    expect([200, 201]).toContain(res.status); // 201 on first create
    const orderId = res.body.orderId;
    expect(orderId).toBeTruthy();
    expect(res.headers['x-order-id']).toBe(orderId);

    const after = await prisma.warehouse.findMany({ select: { id: true, stockUnits: true } });
    const totalBefore = before.reduce((s, w) => s + w.stockUnits, 0);
    const totalAfter = after.reduce((s, w) => s + w.stockUnits, 0);
    expect(totalBefore - totalAfter).toBe(10); // exact decrement
  });

  it('200 idempotent replay with same key (no further stock change)', async () => {
    const key = 'demo-key-2';
    const before = await prisma.warehouse.findMany({ select: { stockUnits: true } });
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', key)
      .send({ quantity: 3, shipTo: { lat: 40.71, lng: -74.0 } })
      .expect(201);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', key)
      .send({ quantity: 3, shipTo: { lat: 40.71, lng: -74.0 } });

    expect(res.status).toBe(200);
    expect(res.headers['x-idempotency-replayed']).toBe('true');

    const after = await prisma.warehouse.findMany({ select: { stockUnits: true } });
    const sum = (xs: { stockUnits: number }[]) => xs.reduce((s, x) => s + x.stockUnits, 0);
    expect(sum(before) - sum(after)).toBe(3); // unchanged by replay
  });

  it('409 insufficient stock', async () => {
    // set all stock to 0 for this test
    await prisma.warehouse.updateMany({ data: { stockUnits: 0 } });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', 'key-insufficient')
      .send({ quantity: 5, shipTo: { lat: 40.71, lng: -74.0 } });

    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('INSUFFICIENT_STOCK');

    // restore stock
    await prisma.warehouse.updateMany({ data: { stockUnits: 1000 } });
  });

  it('409 shipping > 15% (far destination)', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', 'key-shipratio')
      // Far location to blow up shipping (e.g., middle of ocean)
      .send({ quantity: 10, shipTo: { lat: -33.86, lng: 151.21 } }); // Sydney
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('SHIPPING_EXCEEDS_15_PERCENT');
  });
});
