// Set NODE_ENV before any imports (so app mounts in test-mode)
process.env.NODE_ENV = 'test';

import request from 'supertest';
import { prisma } from '../../../src/common/prisma';

import type { Express } from 'express';

const ADMIN = 'Bearer dummy.admin.tester';
const SALES = 'Bearer dummy.sales.tester';

describe('Admin Pricing APIs', () => {
  let app: Express;

  beforeAll(async () => {
    const { createApp } = await import('../../../src/app');
    app = createApp();
  });

  afterAll(async () => {
    // cleanup any test-created data
    await prisma.discountTier.deleteMany({
      where: { ruleSet: { name: { startsWith: 'TEST-' } } },
    });
    await prisma.pricingRuleSet.deleteMany({
      where: { name: { startsWith: 'TEST-' } },
    });
    await prisma.$disconnect();
  });

  it('sanity: /v1/ping', async () => {
    const res = await request(app).get('/api/v1/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });

  describe('POST /v1/admin/pricing/rulesets', () => {
    it('401 without auth', async () => {
      const res = await request(app).post('/api/v1/admin/pricing/rulesets').send({});
      expect(res.status).toBe(401);
    });

    it('403 for non-admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/pricing/rulesets')
        .set('Authorization', SALES)
        .send({});
      expect(res.status).toBe(403);
    });

    it('422 on invalid body (shippingMaxRatio > 1)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/pricing/rulesets')
        .set('Authorization', ADMIN)
        .send({
          name: 'TEST-invalid',
          unitPriceCents: 15000,
          unitWeightKg: 0.365,
          shipRatePerKgKm: 0.01,
          shippingMaxRatio: 1.5, // invalid
        });
      expect(res.status).toBe(422);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body?.error?.details)).toBe(true);
    });

    it('201 creates a ruleset (effective now)', async () => {
      const body = {
        name: 'TEST-RS-1',
        unitPriceCents: 15000,
        unitWeightKg: 0.365,
        shipRatePerKgKm: 0.01,
        shippingMaxRatio: 0.15,
      };
      const res = await request(app)
        .post('/api/v1/admin/pricing/rulesets')
        .set('Authorization', ADMIN)
        .send(body);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('effectiveFrom');

      const db = await prisma.pricingRuleSet.findUnique({
        where: { id: res.body.id },
      });
      expect(db?.name).toBe(body.name);
      expect(db?.unitPriceCents).toBe(body.unitPriceCents);
    });
  });

  describe('PUT /v1/admin/pricing/rulesets/:id/tiers', () => {
    it('401 without auth', async () => {
      const res = await request(app)
        .put('/api/v1/admin/pricing/rulesets/00000000-0000-0000-0000-000000000000/tiers')
        .send({ tiers: [{ threshold: 25, pct: 5 }] });
      expect(res.status).toBe(401);
    });

    it('404 when ruleset not found', async () => {
      const res = await request(app)
        .put('/api/v1/admin/pricing/rulesets/00000000-0000-0000-0000-000000000000/tiers')
        .set('Authorization', ADMIN)
        .send({ tiers: [{ threshold: 25, pct: 5 }] });
      expect(res.status).toBe(404);
    });

    it('422 on invalid tiers (empty array)', async () => {
      // create a ruleset to target
      const create = await request(app)
        .post('/api/v1/admin/pricing/rulesets')
        .set('Authorization', ADMIN)
        .send({
          name: 'TEST-RS-2',
          unitPriceCents: 15000,
          unitWeightKg: 0.365,
          shipRatePerKgKm: 0.01,
          shippingMaxRatio: 0.15,
        });
      expect(create.status).toBe(201);
      const id = create.body.id as string;

      const res = await request(app)
        .put(`/api/v1/admin/pricing/rulesets/${id}/tiers`)
        .set('Authorization', ADMIN)
        .send({ tiers: [] }); // invalid
      expect(res.status).toBe(422);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('422 on invalid tier value (pct > 100)', async () => {
      const create = await request(app)
        .post('/api/v1/admin/pricing/rulesets')
        .set('Authorization', ADMIN)
        .send({
          name: 'TEST-RS-3',
          unitPriceCents: 15000,
          unitWeightKg: 0.365,
          shipRatePerKgKm: 0.01,
          shippingMaxRatio: 0.15,
        });
      expect(create.status).toBe(201);
      const id = create.body.id as string;

      const res = await request(app)
        .put(`/api/v1/admin/pricing/rulesets/${id}/tiers`)
        .set('Authorization', ADMIN)
        .send({ tiers: [{ threshold: 10, pct: 120 }] }); // invalid pct
      expect(res.status).toBe(422);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('200 replaces tiers and persists them', async () => {
      // create a ruleset
      const create = await request(app)
        .post('/api/v1/admin/pricing/rulesets')
        .set('Authorization', ADMIN)
        .send({
          name: 'TEST-RS-4',
          unitPriceCents: 15000,
          unitWeightKg: 0.365,
          shipRatePerKgKm: 0.01,
          shippingMaxRatio: 0.15,
        });
      expect(create.status).toBe(201);
      const id = create.body.id as string;

      // replace tiers
      const payload = {
        tiers: [
          { threshold: 25, pct: 5 },
          { threshold: 50, pct: 10 },
          { threshold: 100, pct: 15 },
          { threshold: 250, pct: 20 },
        ],
      };
      const res = await request(app)
        .put(`/api/v1/admin/pricing/rulesets/${id}/tiers`)
        .set('Authorization', ADMIN)
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ruleSetId: id, tiers: 4 });

      const saved = await prisma.discountTier.findMany({
        where: { ruleSetId: id },
        orderBy: [{ priority: 'desc' }, { threshold: 'desc' }],
      });
      expect(saved.length).toBe(4);
      expect(saved.some((t) => t.threshold === 250 && t.pct === 20)).toBe(true);
    });
  });
});
