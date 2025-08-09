import { Router } from 'express';
import authRouter from '../modules/auth/http/auth.router';

export const routes = Router();

// versioned API namespace
const v1 = Router();

// public sanity route under /api
v1.get('/ping', (_req, res) => res.json({ pong: true }));

// auth (has a public + protected route)
v1.use('/auth', authRouter);

// TODO: mount orders, warehouses when ready
// v1.use("/orders", ordersRouter);

routes.use('/v1', v1);
export default routes;
