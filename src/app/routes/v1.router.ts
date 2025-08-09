import { Router } from 'express';
import authRouter from '../../modules/auth/http/auth.router';
import warehousesRouter from '../../modules/warehouses/http/warehouses.router';

const v1 = Router();

v1.get('/ping', (_req, res) => res.json({ pong: true }));
v1.use('/auth', authRouter);
v1.use('/warehouses', warehousesRouter);
// v1.use("/orders", ordersRouter); // later

export default v1;
