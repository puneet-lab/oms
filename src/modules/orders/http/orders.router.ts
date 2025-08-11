import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth } from '../../../app/middlewares/auth';
import { validateRequest, sendJson } from '../../../common/validate';
import {
  CreateOrderRequestSchema,
  CreateOrderResponseSchema,
  IdempotencyHeaderSchema,
  type CreateOrderRequest,
} from '../domain/order';
import { CreateOrderService } from '../app/create';

const r = Router();
const svc = new CreateOrderService();

r.post(
  '/',
  requireAuth('sales', 'admin'),
  validateRequest({
    body: CreateOrderRequestSchema,
    headers: IdempotencyHeaderSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.validated!.body as CreateOrderRequest;
      const headers = req.validated!.headers as { 'idempotency-key': string };
      const result = await svc.execute(body, headers['idempotency-key'], req.user?.id);

      res.setHeader('X-Order-Id', result.orderId);
      res.setHeader('X-Rule-Set-Id', result.ruleSetId);
      if (result.replay) res.setHeader('X-Idempotency-Replayed', 'true');

      res.status(result.replay ? 200 : 201);
      return sendJson(res, CreateOrderResponseSchema, {
        orderId: result.orderId,
        ruleSetId: result.ruleSetId,
        totals: result.totals,
        allocation: result.allocation,
      });
    } catch (e) {
      next(e);
    }
  },
);

export default r;
