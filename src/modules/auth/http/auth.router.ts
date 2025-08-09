import { Router } from 'express';
import { requireAuth } from '../../../app/middlewares/auth';

const r = Router();

// Public: usage + roles
r.get('/', (_req, res) => {
  res.json({ usage: 'Authorization: Bearer dummy.<role>.<userId>', roles: ['sales', 'admin'] });
});

// Protected: echo current user
r.get('/me', requireAuth('sales', 'admin'), (req, res) => {
  res.json({ user: req.user });
});

export default r;
