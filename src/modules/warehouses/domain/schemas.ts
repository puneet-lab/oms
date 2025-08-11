import { z } from 'zod';

export const WarehouseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  stockUnits: z.number().int().min(0),
});

export type Warehouse = z.infer<typeof WarehouseSchema>;

// Query (optional pagination now, defaults applied)
export const ListWarehousesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Response
export const ListWarehousesResponseSchema = z.object({
  data: z.array(WarehouseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});
export type ListWarehousesQuery = z.infer<typeof ListWarehousesQuerySchema>;
export type ListWarehousesResponse = z.infer<typeof ListWarehousesResponseSchema>;
