import { prisma } from '../../../common/prisma';
import { WarehouseSchema, type Warehouse } from '../domain/allocation';

export async function loadAllWarehouses(): Promise<Warehouse[]> {
  const rows = await prisma.warehouse.findMany({
    select: { id: true, name: true, lat: true, lng: true, stockUnits: true },
  });
  return rows.map((r) => WarehouseSchema.parse(r));
}
