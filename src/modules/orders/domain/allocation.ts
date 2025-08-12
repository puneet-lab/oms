import { z } from 'zod';
import { haversineKm } from '../../shipping/app/distance';

const cents = (d: number) => Math.round(d * 100);

/** Schemas (domain-only, no infra) */
export const ShipToSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const WarehouseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  stockUnits: z.number().int().min(0),
});
export type Warehouse = z.infer<typeof WarehouseSchema>;

export const AllocationItemSchema = z.object({
  warehouseId: z.uuid(),
  quantity: z.number().int().min(1),
  distanceKm: z.number().min(0),
  shippingCents: z.number().int().min(0),
});
export type AllocationItem = z.infer<typeof AllocationItemSchema>;

export const AllocateInputSchema = z.object({
  qty: z.number().int().min(1),
  shipTo: ShipToSchema,
  warehouses: z.array(WarehouseSchema),
  rules: z.object({
    unitWeightKg: z.number().min(0),
    shipRatePerKgKm: z.number().min(0),
  }),
});
export type AllocateInput = z.infer<typeof AllocateInputSchema>;

export const AllocateOutputSchema = z.object({
  items: z.array(AllocationItemSchema),
  unallocated: z.number().int().min(0),
});
export type AllocateOutput = z.infer<typeof AllocateOutputSchema>;

/** Greedy nearest-first allocation with per-slice shipping (validated I/O) */
export function allocateNearest(raw: AllocateInput): AllocateOutput {
  const args = AllocateInputSchema.parse(raw);

  const enriched = args.warehouses
    .map((w) => ({
      ...w,
      distanceKm: haversineKm({ lat: w.lat, lng: w.lng }, args.shipTo),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  let remaining = args.qty;
  const items: Array<z.infer<typeof AllocationItemSchema>> = [];

  for (const w of enriched) {
    if (remaining <= 0) break;
    const take = Math.min(w.stockUnits, remaining);
    if (take <= 0) continue;

    const weightKg = take * args.rules.unitWeightKg;
    const shipDollars = weightKg * w.distanceKm * args.rules.shipRatePerKgKm;

    items.push({
      warehouseId: w.id,
      quantity: take,
      distanceKm: Math.round(w.distanceKm * 10) / 10,
      shippingCents: cents(shipDollars),
    });

    remaining -= take;
  }

  return AllocateOutputSchema.parse({ items, unallocated: remaining });
}
