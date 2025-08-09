import type { Warehouse } from './schemas.ts';

export interface WarehouseRepository {
  listAll(pagination: {
    page: number;
    limit: number;
  }): Promise<{ items: Warehouse[]; total: number }>;
}
