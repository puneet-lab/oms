import { Router } from 'express';
import { requireAuth } from '../../../app/middlewares/auth';
import { validateRequest, sendJson } from '../../../common/validate';
import {
  CreateQuoteRequestSchema,
  QuoteResponseSchema,
  type CreateQuoteRequest,
} from '../domain/schemas';
import { QuoteService } from '../app/quote';

const r = Router();
const quoteService = new QuoteService();

// POST /v1/orders/quotes  (create quote)
r.post(
  '/quotes',
  requireAuth('sales', 'admin'),
  validateRequest({ body: CreateQuoteRequestSchema }),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as CreateQuoteRequest;
      const result = await quoteService.execute(body);

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Rule-Set-Id', result.ruleSetId);

      return sendJson(res, QuoteResponseSchema, result);
    } catch (e) {
      next(e);
    }
  },
);

export default r;
