import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Leitura do histórico do chamado. Os eventos são gravados junto com cada alteração
// (escrita aninhada ou transação nos repositórios de chamado, apontamento e anexo).

export class TicketEventRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findByTicketId(ticketId: string) {
    return this.db.ticketEvent.findMany({
      where: { ticketId },
      include: { actor: { select: { name: true } } },
      orderBy: { sequence: "asc" },
    });
  }
}

export const ticketEventRepository = new TicketEventRepository();
