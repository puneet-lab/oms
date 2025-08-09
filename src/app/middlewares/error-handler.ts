import type { NextFunction, Request, Response } from 'express';

interface APIError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(err: APIError, _req: Request, res: Response, _next: NextFunction) {
  const status = Number(err.status) || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message = err.message || 'Something went wrong';
  res.status(status).json({ error: { code, message } });
}
