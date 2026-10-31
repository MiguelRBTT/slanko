import type { ContractStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProfitabilityFilters = {
  contractId?: string;
  clientId?: string;
  workedFrom?: Date;
  workedTo?: Date;
  /** Situações de contrato incluídas (padrão: só ACTIVE). */
  contractStatuses?: ContractStatus[];
};

export class ProfitabilityRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findContracts(filters: ProfitabilityFilters = {}) {
    const where: Prisma.ContractWhereInput = {
      status: { in: filters.contractStatuses ?? ["ACTIVE"] },
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
                user: { select: { id: true, name: true } },
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
