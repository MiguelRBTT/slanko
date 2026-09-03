import type { ContractStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ContractListFilters = {
  clientId?: string;
  status?: ContractStatus;
};

export class ContractRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findMany(filters: ContractListFilters = {}) {
    const where: Prisma.ContractWhereInput = {};

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    return this.db.contract.findMany({
      where,
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });
  }

  findById(id: string) {
    return this.db.contract.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.db.contract.findUnique({ where: { code } });
  }

  create(data: Prisma.ContractCreateInput) {
    return this.db.contract.create({ data });
  }

  update(id: string, data: Prisma.ContractUpdateInput) {
    return this.db.contract.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.db.contract.delete({ where: { id } });
  }

  countTickets(contractId: string) {
    return this.db.ticket.count({ where: { contractId } });
  }
}

export const contractRepository = new ContractRepository();
