import {
  assertAttachmentSize,
  assertCanAddAttachment,
  assertFileSignature,
  resolveAttachmentKind,
  sanitizeOriginalFileName,
} from "@/lib/attachments/rules";
import {
  deleteTicketAttachmentFile,
  deleteTicketAttachmentFiles,
  readTicketAttachmentFile,
  saveTicketAttachmentFile,
} from "@/lib/attachments/storage";
import {
  BadRequestError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { assertTicketAccess } from "@/lib/tickets/access";
import {
  TicketAttachmentRepository,
  ticketAttachmentRepository,
} from "@/repositories/ticket-attachment.repository";
import { TicketRepository, ticketRepository } from "@/repositories/ticket.repository";
import type { AuthContext } from "@/types/auth";
import { toPublicAttachment, type PublicAttachment } from "@/types/attachment";

export type AttachmentFilePayload = {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export class TicketAttachmentService {
  constructor(
    private readonly attachments: TicketAttachmentRepository = ticketAttachmentRepository,
    private readonly tickets: TicketRepository = ticketRepository,
  ) {}

  async listAttachments(ticketId: string, auth: AuthContext): Promise<PublicAttachment[]> {
    await this.requireAccessibleTicket(ticketId, auth);
    const rows = await this.attachments.findByTicketId(ticketId);
    return rows.map(toPublicAttachment);
  }

  async createAttachment(
    ticketId: string,
    file: AttachmentFilePayload,
    auth: AuthContext,
  ): Promise<PublicAttachment> {
    const ticket = await this.requireAccessibleTicket(ticketId, auth);

    if (ticket.status === "CLOSED") {
      throw new BadRequestError("Closed tickets cannot receive attachments");
    }

    const count = await this.attachments.countByTicketId(ticketId);
    assertCanAddAttachment(count);

    const mimeType = file.mimeType.trim().toLowerCase();
    const kind = resolveAttachmentKind(mimeType);
    assertAttachmentSize(kind, file.sizeBytes);
    assertFileSignature(mimeType, file.bytes);
    const fileName = sanitizeOriginalFileName(file.fileName);

    const storageKey = await saveTicketAttachmentFile({
      ticketId,
      mimeType,
      bytes: file.bytes,
    });

    try {
      const created = await this.attachments.create({
        ticketId,
        uploadedById: auth.userId,
        kind,
        fileName,
        mimeType,
        sizeBytes: file.sizeBytes,
        storageKey,
      });

      return toPublicAttachment(created);
    } catch (error) {
      await deleteTicketAttachmentFile(storageKey);
      throw error;
    }
  }

  async deleteAttachment(
    ticketId: string,
    attachmentId: string,
    auth: AuthContext,
  ): Promise<void> {
    await this.requireAccessibleTicket(ticketId, auth);

    const attachment = await this.attachments.findById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new NotFoundError("Attachment not found");
    }

    await this.attachments.delete(attachmentId, auth.userId);
    await deleteTicketAttachmentFile(attachment.storageKey);
  }

  async getAttachmentFile(
    ticketId: string,
    attachmentId: string,
    auth: AuthContext,
  ): Promise<{ bytes: Buffer; mimeType: string; fileName: string }> {
    await this.requireAccessibleTicket(ticketId, auth);

    const attachment = await this.attachments.findById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new NotFoundError("Attachment not found");
    }

    const bytes = await readTicketAttachmentFile(attachment.storageKey);
    return {
      bytes,
      mimeType: attachment.mimeType,
      fileName: attachment.fileName,
    };
  }

  async deleteAllForTicket(ticketId: string): Promise<void> {
    const rows = await this.attachments.findByTicketId(ticketId);
    await deleteTicketAttachmentFiles(rows.map((row) => row.storageKey));
    await this.attachments.deleteManyByTicketId(ticketId);
  }

  private async requireAccessibleTicket(ticketId: string, auth: AuthContext) {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    assertTicketAccess(ticket, auth);
    return ticket;
  }
}

export const ticketAttachmentService = new TicketAttachmentService();
