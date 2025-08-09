import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../../../src/modules/auth/domain/types';
import { authOptional, requireAuth } from '../../../src/app/middlewares/auth';

type AuthUser = { id: string; role: Role };
type ErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED';
type ErrorBody = { error: { code: ErrorCode; message: string } };
type UserBody = { user: AuthUser };

type ReqStub = {
  header(name: string): string | undefined;
  user?: AuthUser;
};

type ResStub = {
  statusCode: number;
  body: ErrorBody | UserBody | null;
  headers: Record<string, string>;
  status(code: number): ResStub;
  json(body: ErrorBody | UserBody): ResStub;
  setHeader(name: string, value: string): ResStub;
};

function fakeReq(headers: Record<string, string> = {}): ReqStub {
  return {
    header: (k: string) => headers[k.toLowerCase()],
  };
}

function fakeRes(): ResStub {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

// Type guards (no `any`)
function isErrorBody(b: unknown): b is ErrorBody {
  if (typeof b !== 'object' || b === null) return false;
  const rec = b as Record<string, unknown>;
  const err = rec['error'];
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  return typeof e['code'] === 'string' && typeof e['message'] === 'string';
}

describe('auth middleware', () => {
  it('authOptional attaches user when header is valid', () => {
    const req = fakeReq({ authorization: 'Bearer dummy.sales.abc' });
    const res = fakeRes();
    const next: NextFunction = vi.fn();

    authOptional(req as unknown as Request, res as unknown as Response, next);

    expect(req.user).toEqual({ id: 'abc', role: 'sales' });
    expect(next).toHaveBeenCalled();
  });

  it('requireAuth returns 401 when missing', () => {
    const req = fakeReq();
    const res = fakeRes();
    const next: NextFunction = vi.fn();

    requireAuth('sales')(req as unknown as Request, res as unknown as Response, next);

    expect(res.statusCode).toBe(401);
    expect(isErrorBody(res.body)).toBe(true);
    if (isErrorBody(res.body)) {
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth returns 403 when role mismatch', () => {
    const req = fakeReq({ authorization: 'Bearer dummy.sales.u1' });
    const res = fakeRes();
    const next: NextFunction = vi.fn();

    // simulate authOptional first
    authOptional(req as unknown as Request, res as unknown as Response, () => {});

    requireAuth('admin')(req as unknown as Request, res as unknown as Response, next);

    expect(res.statusCode).toBe(403);
    expect(isErrorBody(res.body)).toBe(true);
    if (isErrorBody(res.body)) {
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
    expect(next).not.toHaveBeenCalled();
  });
});
