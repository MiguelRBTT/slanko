import type { Prisma, PrismaClient, TicketPriority, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TicketListFilters = {
  contractId?: string;
  status?: TicketStatus;
  assignedToId?: string;
  priority?: TicketPriority;
  openedById?: string;
  accessibleByUserId?: string;
};

export class TicketRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findMany(filters: TicketListFilters = {}) {
    const where: Prisma.TicketWhereInput = {};

    if (filters.contractId) {
      where.contractId = filters.contractId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.openedById) {
      where.openedById = filters.openedById;
    }

    if (filters.accessibleByUserId) {
      where.OR = [
        { assignedToId: filters.accessibleByUserId },
        { openedById: filters.accessibleByUserId },
      ];
    }

    return this.db.ticket.findMany({
      where,
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
    });
  }

  findById(id: string) {
    return this.db.ticket.findUnique({ where: { id } });
  }

  create(data: Prisma.TicketCreateInput) {
    return this.db.ticket.create({ data });
  }

  update(id: string, data: Prisma.TicketUpdateInput) {
    return this.db.ticket.update({ where: { id }, data });
  }
}

export const ticketRepository = new TicketRepository();
