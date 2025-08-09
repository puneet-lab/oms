import { Router } from 'express';
import { validateRequest, sendJson } from '../../../common/validate';
import { PrismaWarehouseRepository } from '../infra/prisma.repository';
import { ListWarehouses } from '../app/list-warehouses';
import {
  ListWarehousesQuerySchema,
  ListWarehousesResponseSchema,
  type ListWarehousesQuery,
} from '../domain/schemas';

const r = Router();
const listWarehouses = new ListWarehouses(new PrismaWarehouseRepository());

r.get('/', validateRequest({ query: ListWarehousesQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit } = (req.validated?.query as ListWarehousesQuery) ?? { page: 1, limit: 50 };
    const result = await listWarehouses.execute({ page, limit });
    return sendJson(res, ListWarehousesResponseSchema, result);
  } catch (err) {
    next(err);
  }
});

export default r;
