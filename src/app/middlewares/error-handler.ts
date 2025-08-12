import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../common/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error Handler:', err);
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  const status = 500;
  return res
    .status(status)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
