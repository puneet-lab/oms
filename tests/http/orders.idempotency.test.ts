process.env.NODE_ENV = 'test';

import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/common/prisma';

const ADMIN = 'Bearer dummy.admin.tester';

async function ensureRuleSetAndWarehouses() {
  let rs = await prisma.pricingRuleSet.findFirst();
  if (!rs) {
    rs = await prisma.pricingRuleSet.create({
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
        { ruleSetId: rs.id, threshold: 25, pct: 5, priority: 1 },
        { ruleSetId: rs.id, threshold: 50, pct: 10, priority: 2 },
        { ruleSetId: rs.id, threshold: 100, pct: 15, priority: 3 },
        { ruleSetId: rs.id, threshold: 250, pct: 20, priority: 4 },
      ],
    });
  }

  const wcount = await prisma.warehouse.count();
  if (wcount === 0) {
    await prisma.warehouse.createMany({
      data: [
        { name: 'W-NY', lat: 40.7, lng: -74.0, stockUnits: 1000 },
        { name: 'W-LA', lat: 34.05, lng: -118.25, stockUnits: 1000 },
      ],
    });
  }
}

describe('POST /api/v1/orders - idempotency', () => {
  let app: Express;

  beforeAll(async () => {
    const { createApp } = await import('../../src/app');
    app = createApp();
    await ensureRuleSetAndWarehouses();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates once and returns the same order on retry with the same Idempotency-Key', async () => {
    const key = `k-${Date.now()}`;
    const body = { quantity: 2, shipTo: { lat: 40.71, lng: -74.0 } };

    const first = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', key)
      .send(body);

    expect(first.status).toBe(201);
    expect(first.body?.orderId).toBeTruthy();
    expect(first.headers['x-order-id']).toBe(first.body.orderId);

    const second = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', ADMIN)
      .set('Idempotency-Key', key)
      .send(body);

    // Route sets 200 on replay:
    expect(second.status).toBe(200);
    expect(second.body?.orderId).toBe(first.body.orderId);
    expect(second.headers['x-idempotency-replayed']).toBe('true');

    const count = await prisma.order.count({ where: { idempotencyKey: key } });
    expect(count).toBe(1);
  });

  it('200 idempotent replay with same key (no further stock change)', async () => {
    const key = `demo-key-${Date.now()}`;
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
});
