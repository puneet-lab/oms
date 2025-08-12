import { Router } from 'express';
import v1 from './v1.router';

const routes = Router();
routes.use('/v1', v1);

// future:
// import v2 from "./v2.router";
// routes.use("/v2", v2);

export default routes;
