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

  async replaceObservers(ticketId: string, userIds: string[]) {
    await this.db.$transaction(async (tx) => {
      await tx.ticketObserver.deleteMany({ where: { ticketId } });

      if (userIds.length === 0) {
        return;
      }

      await tx.ticketObserver.createMany({
        data: userIds.map((userId) => ({ ticketId, userId })),
      });
    });
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
