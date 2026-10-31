import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateTimeEntryData = {
  ticketId: string;
  userId: string;
  hours: number;
  hourlyCost: number;
  note: string | null;
  workedAt: Date;
};

export type UpdateTimeEntryData = {
  hours?: number;
  note?: string | null;
  workedAt?: Date;
};

function entrySnapshot(entry: { hours: { toString(): string }; workedAt: Date; note: string | null }) {
  return {
    hours: entry.hours.toString(),
    workedAt: entry.workedAt.toISOString(),
    note: entry.note,
  } satisfies Prisma.InputJsonObject;
}

export class TimeEntryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findByTicketId(ticketId: string) {
    return this.db.timeEntry.findMany({
      where: { ticketId },
      orderBy: { workedAt: "desc" },
    });
  }

  findById(id: string) {
    return this.db.timeEntry.findUnique({ where: { id } });
  }

  /** Cria o apontamento e o evento TIME_LOGGED do histórico na mesma transação. */
  create(data: CreateTimeEntryData) {
    return this.db.$transaction(async (tx) => {
      const entry = await tx.timeEntry.create({ data });

      // O 1º apontamento marca o início do atendimento (1ª resposta do SLA), se ainda não houver.
      await tx.ticket.updateMany({
        where: { id: data.ticketId, firstResponseAt: null },
        data: { firstResponseAt: entry.createdAt },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: data.ticketId,
          actorId: data.userId,
          type: "TIME_LOGGED",
          data: { timeEntryId: entry.id, ...entrySnapshot(entry) },
        },
      });

      return entry;
    });
  }

  /** Corrige o apontamento e registra TIME_UPDATED (antes/depois) na mesma transação. */
  update(id: string, data: UpdateTimeEntryData, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const before = await tx.timeEntry.findUniqueOrThrow({ where: { id } });
      const entry = await tx.timeEntry.update({ where: { id }, data });

      await tx.ticketEvent.create({
        data: {
          ticketId: entry.ticketId,
          actorId,
          type: "TIME_UPDATED",
          data: { timeEntryId: id, from: entrySnapshot(before), to: entrySnapshot(entry) },
        },
      });

      return entry;
    });
  }

  /** Exclui o apontamento e registra TIME_DELETED com o valor removido na mesma transação. */
  delete(id: string, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const removed = await tx.timeEntry.delete({ where: { id } });

      await tx.ticketEvent.create({
        data: {
          ticketId: removed.ticketId,
          actorId,
          type: "TIME_DELETED",
          data: { timeEntryId: id, ...entrySnapshot(removed) },
        },
      });

      return removed;
    });
  }
}

export const timeEntryRepository = new TimeEntryRepository();
