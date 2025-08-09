import { prisma } from '../../../common/prisma';
import type { WarehouseRepository } from '../domain/repository';
import type { Warehouse } from '../domain/schemas';

export class PrismaWarehouseRepository implements WarehouseRepository {
  async listAll({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }): Promise<{ items: Warehouse[]; total: number }> {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma.$transaction([
      prisma.warehouse.findMany({ orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.warehouse.count(),
    ]);
    return { items: items as Warehouse[], total };
  }
}
