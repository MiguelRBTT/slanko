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

const ticketAccessInclude = {
  assignedTo: { select: { id: true, name: true } },
  observers: { select: { userId: true } },
} satisfies Prisma.TicketInclude;

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
        {
          AND: [
            { openedById: filters.accessibleByUserId },
            { assignedToId: null },
          ],
        },
        { observers: { some: { userId: filters.accessibleByUserId } } },
      ];
    }

    return this.db.ticket.findMany({
      where,
      include: ticketAccessInclude,
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
    });
  }

  findById(id: string) {
    return this.db.ticket.findUnique({
      where: { id },
      include: ticketAccessInclude,
    });
  }

  create(data: Prisma.TicketCreateInput) {
    return this.db.ticket.create({
      data,
      include: ticketAccessInclude,
    });
  }

  update(id: string, data: Prisma.TicketUpdateInput) {
    return this.db.ticket.update({
      where: { id },
      data,
      include: ticketAccessInclude,
    });
  }

  /** Soma das horas apontadas por chamado, numa única consulta agregada. */
  async sumLoggedHours(ticketIds: string[]): Promise<Map<string, string>> {
    if (ticketIds.length === 0) {
      return new Map();
    }

    const rows = await this.db.timeEntry.groupBy({
      by: ["ticketId"],
      where: { ticketId: { in: ticketIds } },
      _sum: { hours: true },
    });

    return new Map(rows.map((row) => [row.ticketId, row._sum.hours?.toString() ?? "0"]));
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.db.ticket.groupBy({ by: ["status"], _count: { _all: true } });
    return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
  }

  countTimeEntries(ticketId: string) {
    return this.db.timeEntry.count({ where: { ticketId } });
  }

  delete(id: string) {
    return this.db.$transaction(async (tx) => {
      await tx.ticketAttachment.deleteMany({ where: { ticketId: id } });
      await tx.timeEntry.deleteMany({ where: { ticketId: id } });
      await tx.ticketObserver.deleteMany({ where: { ticketId: id } });
      await tx.ticket.delete({ where: { id } });
    });
  }
}

export const ticketRepository = new TicketRepository();
