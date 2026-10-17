import type { AttachmentKind, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateAttachmentData = {
  ticketId: string;
  uploadedById: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
};

export class TicketAttachmentRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findByTicketId(ticketId: string) {
    return this.db.ticketAttachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
  }

  findById(id: string) {
    return this.db.ticketAttachment.findUnique({ where: { id } });
  }

  countByTicketId(ticketId: string) {
    return this.db.ticketAttachment.count({ where: { ticketId } });
  }

  create(data: CreateAttachmentData) {
    return this.db.ticketAttachment.create({ data });
  }

  delete(id: string) {
    return this.db.ticketAttachment.delete({ where: { id } });
  }

  deleteManyByTicketId(ticketId: string) {
    return this.db.ticketAttachment.deleteMany({ where: { ticketId } });
  }
}

export const ticketAttachmentRepository = new TicketAttachmentRepository();

export type TicketAttachmentRecord = Prisma.TicketAttachmentGetPayload<object>;
