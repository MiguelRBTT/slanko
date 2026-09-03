import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SlaTicketFilters = {
  contractId?: string;
  clientId?: string;
  openedFrom?: Date;
  openedTo?: Date;
};

export class SlaRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findTickets(filters: SlaTicketFilters = {}) {
    const where: Prisma.TicketWhereInput = {
      contract: {
        status: "ACTIVE",
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
      },
    };

    if (filters.contractId) {
      where.contractId = filters.contractId;
    }

    if (filters.openedFrom || filters.openedTo) {
      where.openedAt = {
        ...(filters.openedFrom ? { gte: filters.openedFrom } : {}),
        ...(filters.openedTo ? { lte: filters.openedTo } : {}),
      };
    }

    return this.db.ticket.findMany({
      where,
      include: {
        contract: true,
      },
      orderBy: { openedAt: "desc" },
    });
  }

  findActiveContract(id: string) {
    return this.db.contract.findFirst({
      where: { id, status: "ACTIVE" },
    });
  }
}

export const slaRepository = new SlaRepository();
