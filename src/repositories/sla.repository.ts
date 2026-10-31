import type { ContractStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REPORTABLE_CONTRACT_STATUSES } from "@/lib/reports/contract-status-filter";

export type SlaTicketFilters = {
  contractId?: string;
  clientId?: string;
  openedFrom?: Date;
  openedTo?: Date;
  /** Situações de contrato incluídas (padrão: só ACTIVE). */
  contractStatuses?: ContractStatus[];
};

export class SlaRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findTickets(filters: SlaTicketFilters = {}) {
    const where: Prisma.TicketWhereInput = {
      contract: {
        status: { in: filters.contractStatuses ?? ["ACTIVE"] },
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

  /** Contrato que pode ter relatório: qualquer situação, exceto rascunho. */
  findReportableContract(id: string) {
    return this.db.contract.findFirst({
      where: { id, status: { in: REPORTABLE_CONTRACT_STATUSES } },
    });
  }
}

export const slaRepository = new SlaRepository();
