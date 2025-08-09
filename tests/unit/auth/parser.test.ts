import { describe, it, expect } from 'vitest';
import { parseAuthHeader } from '../../../src/modules/auth/app/parser';

describe('parseAuthHeader', () => {
  it('parses sales token', () => {
    expect(parseAuthHeader('Bearer dummy.sales.u123')).toEqual({ id: 'u123', role: 'sales' });
  });

  it('parses admin token', () => {
    expect(parseAuthHeader('Bearer dummy.admin.corp-1')).toEqual({ id: 'corp-1', role: 'admin' });
  });

  it('returns null on missing header', () => {
    expect(parseAuthHeader(undefined)).toBeNull();
  });

  it('returns null on wrong prefix', () => {
    expect(parseAuthHeader('Token dummy.sales.1')).toBeNull();
  });

  it('returns null on bad role', () => {
    expect(parseAuthHeader('Bearer dummy.customer.x')).toBeNull();
  });

  it('returns null on malformed token', () => {
    expect(parseAuthHeader('Bearer dummy.sales')).toBeNull();
  });
});
