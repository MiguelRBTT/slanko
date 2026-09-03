import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ClientListFilters = {
  includeInactive?: boolean;
};

export class ClientRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findMany(filters: ClientListFilters = {}) {
    const where: Prisma.ClientWhereInput = filters.includeInactive ? {} : { active: true };

    return this.db.client.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  findAllActive() {
    return this.findMany({ includeInactive: false });
  }

  findById(id: string) {
    return this.db.client.findUnique({ where: { id } });
  }

  create(data: Prisma.ClientCreateInput) {
    return this.db.client.create({ data });
  }

  update(id: string, data: Prisma.ClientUpdateInput) {
    return this.db.client.update({ where: { id }, data });
  }
}

export const clientRepository = new ClientRepository();
