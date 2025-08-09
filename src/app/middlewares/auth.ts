import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, Role } from '../../modules/auth/domain/types';
import { parseAuthHeader } from '../../modules/auth/app/parser';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  const user = parseAuthHeader(req.header('authorization') ?? undefined);
  if (user) req.user = user;
  next();
}

export function requireAuth(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
      return;
    }
    next();
  };
}
