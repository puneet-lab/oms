import { Router } from 'express';
import { requireAuth } from '../../../app/middlewares/auth';
import { validateRequest } from '../../../common/validate';
import { prisma } from '../../../common/prisma';
import { HttpError } from '../../../common/errors';
import {
  CreateRuleSetSchema,
  type CreateRuleSet,
  ReplaceTiersSchema,
  type ReplaceTiers,
} from '../domain/schemas';
import { CachedRulesProvider } from '../app/cache';

const r = Router();
const rulesCache = new CachedRulesProvider();

// POST /v1/admin/pricing/rulesets  (create ruleset)
r.post(
  '/rulesets',
  requireAuth('admin'),
  validateRequest({ body: CreateRuleSetSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as CreateRuleSet;
      const rs = await prisma.pricingRuleSet.create({
        data: { ...body, createdByUserId: req.user?.id },
        select: { id: true, effectiveFrom: true },
      });
      // invalidate only if it is active now
      if (rs.effectiveFrom <= new Date()) rulesCache.invalidate();
      return res.status(201).json(rs);
    } catch (e) {
      next(e);
    }
  },
);

// PUT /v1/admin/pricing/rulesets/:id/tiers  (replace tiers)
r.put(
  '/rulesets/:id/tiers',
  requireAuth('admin'),
  validateRequest({ body: ReplaceTiersSchema }),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.validated!.body as ReplaceTiers;

      const exists = await prisma.pricingRuleSet.findUnique({
        where: { id },
        select: { effectiveFrom: true },
      });
      if (!exists) throw new HttpError(404, 'NOT_FOUND', 'Rule set not found');

      await prisma.$transaction([
        prisma.discountTier.deleteMany({ where: { ruleSetId: id } }),
        prisma.discountTier.createMany({
          data: body.tiers.map((t, i) => ({
            ruleSetId: id,
            threshold: t.threshold,
            pct: t.pct,
            priority: t.priority ?? i + 1,
          })),
        }),
      ]);

      if (exists.effectiveFrom <= new Date()) rulesCache.invalidate();
      return res.status(200).json({ ruleSetId: id, tiers: body.tiers.length });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
