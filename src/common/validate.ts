import type { RequestHandler, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './errors';

declare module 'express-serve-static-core' {
  interface Request {
    validated?: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
      headers?: unknown;
    };
  }
}

/** Zod v4 schemas: simplified type that only requires parse method */
type Schema<TOut> = {
  parse(input: unknown): TOut;
};

type ReqSchemas<B = unknown, Q = unknown, P = unknown, H = unknown> = {
  body?: Schema<B>;
  query?: Schema<Q>;
  params?: Schema<P>;
  headers?: Schema<H>;
};

function zodIssuesToDetails(err: ZodError) {
  return err.issues.map((i) => ({
    field: i.path.join('.') || '(root)',
    code: String(i.code),
    message: i.message,
  }));
}

/** Parse with Zod; stash on req.validated (do NOT mutate req.*). */
export function validateRequest<B = unknown, Q = unknown, P = unknown, H = unknown>(
  s: ReqSchemas<B, Q, P, H>,
): RequestHandler {
  return (req, res, next) => {
    try {
      const validated = {
        body: s.body?.parse(req.body),
        query: s.query?.parse(req.query),
        params: s.params?.parse(req.params),
        headers: s.headers?.parse(req.headers),
      };

      (req as Request).validated = validated;
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        return next(
          new HttpError(422, 'VALIDATION_ERROR', 'Invalid request', zodIssuesToDetails(e)),
        );
      }
      return next(new HttpError(400, 'BAD_REQUEST', 'Bad Request'));
    }
  };
}

/** Validate the outgoing JSON matches the contract before sending */
export function sendJson<TOut>(res: Response, schema: Schema<TOut>, data: unknown) {
  const parsed = schema.parse(data);
  return res.json(parsed);
}
