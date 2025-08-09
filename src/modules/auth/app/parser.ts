import { z } from 'zod';
import { RoleSchema, type AuthUser } from '../domain/types';

// Header must start with "Bearer "
const BearerSchema = z
  .string()
  .startsWith('Bearer ')
  .transform((s) => s.slice(7)); // strip "Bearer "

// Token parts after "Bearer " = "dummy.<role>.<userId>"
const TokenTuple = z.tuple([z.literal('dummy'), RoleSchema, z.string().min(1)]);

/**
 * Parse Authorization header for dummy tokens.
 *  "Bearer dummy.<role>.<userId>" -> { id, role } | null
 */
export function parseAuthHeader(header?: string): AuthUser | null {
  if (!header) return null;

  const headerRes = BearerSchema.safeParse(header);
  if (!headerRes.success) return null;

  const parts = headerRes.data.split('.');
  if (parts.length < 3) return null;

  const [prefix, roleStr, ...userRest] = parts;
  const userId = userRest.join('.');
  const tok = TokenTuple.safeParse([prefix, roleStr, userId]);
  if (!tok.success) return null;

  const [, role, id] = tok.data;
  return { id, role };
}
