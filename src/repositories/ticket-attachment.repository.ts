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

  /** Cria o anexo e o evento ATTACHMENT_ADDED do histórico na mesma transação. */
  create(data: CreateAttachmentData) {
    return this.db.$transaction(async (tx) => {
      const attachment = await tx.ticketAttachment.create({ data });

      await tx.ticketEvent.create({
        data: {
          ticketId: data.ticketId,
          actorId: data.uploadedById,
          type: "ATTACHMENT_ADDED",
          data: { attachmentId: attachment.id, fileName: attachment.fileName, kind: attachment.kind },
        },
      });

      return attachment;
    });
  }

  /** Remove o anexo e registra ATTACHMENT_REMOVED no histórico na mesma transação. */
  delete(id: string, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const removed = await tx.ticketAttachment.delete({ where: { id } });

      await tx.ticketEvent.create({
        data: {
          ticketId: removed.ticketId,
          actorId,
          type: "ATTACHMENT_REMOVED",
          data: { attachmentId: removed.id, fileName: removed.fileName, kind: removed.kind },
        },
      });

      return removed;
    });
  }

  deleteManyByTicketId(ticketId: string) {
    return this.db.ticketAttachment.deleteMany({ where: { ticketId } });
  }
}

export const ticketAttachmentRepository = new TicketAttachmentRepository();

export type TicketAttachmentRecord = Prisma.TicketAttachmentGetPayload<object>;
