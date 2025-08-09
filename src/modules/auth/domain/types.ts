// Auth domain types: Role ('sales' | 'admin'), AuthUser.
export {};
import { z } from 'zod';

// Single source of truth for roles
export const RoleSchema = z.enum(['sales', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

export type AuthUser = {
  id: string;
  role: Role;
};
