import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class TimeEntryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findByTicketId(ticketId: string) {
    return this.db.timeEntry.findMany({
      where: { ticketId },
      orderBy: { workedAt: "desc" },
    });
  }

  create(data: Prisma.TimeEntryCreateInput) {
    return this.db.timeEntry.create({ data });
  }
}

export const timeEntryRepository = new TimeEntryRepository();
