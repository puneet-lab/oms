import type { WarehouseRepository } from '../domain/repository';

export class ListWarehouses {
  constructor(private repo: WarehouseRepository) {}
  async execute({ page, limit }: { page: number; limit: number }) {
    const { items, total } = await this.repo.listAll({ page, limit });
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }
}
