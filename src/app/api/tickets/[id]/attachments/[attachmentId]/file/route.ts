import { jsonError } from "@/lib/http/api-response";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { ticketAttachmentService } from "@/services/ticket-attachment.service";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export const runtime = "nodejs";

// GET /api/tickets/:id/attachments/:attachmentId/file

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id, attachmentId } = await context.params;
    const file = await ticketAttachmentService.getAttachmentFile(id, attachmentId, auth);

    // Só ASCII imprimível, sem aspas/barra invertida (não quebra o header Content-Disposition).
    const asciiName = file.fileName.replace(/[^\x20-\x7E]|["\\]/g, "_");

    return new Response(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": `inline; filename="${asciiName}"`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
