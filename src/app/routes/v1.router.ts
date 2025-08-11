import { Router } from 'express';
import authRouter from '../../modules/auth/http/auth.router';
import warehousesRouter from '../../modules/warehouses/http/warehouses.router';
import quotesRouter from '../../modules/orders/http/quotes.router';
import createOrdersRouter from '../../modules/orders/http/orders.router';

const v1 = Router();

v1.get('/ping', (_req, res) => res.json({ pong: true }));
v1.use('/auth', authRouter);
v1.use('/warehouses', warehousesRouter);
v1.use('/orders', quotesRouter);
v1.use('/orders', createOrdersRouter);
// admin routes
import adminPricingRouter from '../../modules/pricing/http/admin.pricing.router';
v1.use('/admin/pricing', adminPricingRouter);
// v1.use("/orders", ordersRouter); // later

export default v1;
