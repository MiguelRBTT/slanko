import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProfitabilityFilters = {
  contractId?: string;
  clientId?: string;
  workedFrom?: Date;
  workedTo?: Date;
};

export class ProfitabilityRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findActiveContracts(filters: ProfitabilityFilters = {}) {
    const where: Prisma.ContractWhereInput = {
      status: "ACTIVE",
    };

    if (filters.contractId) {
      where.id = filters.contractId;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    const timeEntryWhere: Prisma.TimeEntryWhereInput = {};

    if (filters.workedFrom || filters.workedTo) {
      timeEntryWhere.workedAt = {
        ...(filters.workedFrom ? { gte: filters.workedFrom } : {}),
        ...(filters.workedTo ? { lte: filters.workedTo } : {}),
      };
    }

    return this.db.contract.findMany({
      where,
      include: {
        tickets: {
          include: {
            timeEntries: {
              where: timeEntryWhere,
              include: {
                user: true,
              },
              orderBy: { workedAt: "desc" },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
  }
}

export const profitabilityRepository = new ProfitabilityRepository();
