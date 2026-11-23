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

/** Anexos do chamado (imagem ou vídeo): valida o arquivo, grava no disco e registra no banco. */
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

    // Chamado encerrado não recebe anexos.
    if (ticket.status === "CLOSED") {
      throw new BadRequestError("Closed tickets cannot receive attachments");
    }

    // No máximo 10 anexos por chamado.
    const count = await this.attachments.countByTicketId(ticketId);
    assertCanAddAttachment(count);

    // Tipo, tamanho (imagem 5 MB, vídeo 50 MB) e assinatura real do arquivo; o tipo informado pelo navegador não basta.
    const mimeType = file.mimeType.trim().toLowerCase();
    const kind = resolveAttachmentKind(mimeType);
    assertAttachmentSize(kind, file.sizeBytes);
    assertFileSignature(mimeType, file.bytes);
    const fileName = sanitizeOriginalFileName(file.fileName);

    // Grava primeiro o arquivo no disco e depois o registro no banco.
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
      // Se o banco falhar, apaga o arquivo para não sobrar arquivo órfão no disco.
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
    // O anexo precisa ser do chamado da URL (impede ler anexo de outro chamado trocando o id).
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new NotFoundError("Attachment not found");
    }

    // Registra quem excluiu no histórico e depois remove o arquivo do disco.
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

  /** Usado na exclusão do chamado: remove os arquivos do disco e os registros dos anexos. */
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
