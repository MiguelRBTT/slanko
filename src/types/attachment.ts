import type { AttachmentKind } from "@prisma/client";

export type PublicAttachment = {
  id: string;
  ticketId: string;
  uploadedById: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
};

export function toPublicAttachment(attachment: {
  id: string;
  ticketId: string;
  uploadedById: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}): PublicAttachment {
  return {
    id: attachment.id,
    ticketId: attachment.ticketId,
    uploadedById: attachment.uploadedById,
    kind: attachment.kind,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    url: `/api/tickets/${attachment.ticketId}/attachments/${attachment.id}/file`,
  };
}
