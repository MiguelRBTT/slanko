import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { ticketAttachmentService } from "@/services/ticket-attachment.service";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export const runtime = "nodejs";

// DELETE /api/tickets/:id/attachments/:attachmentId

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id, attachmentId } = await context.params;
    await ticketAttachmentService.deleteAttachment(id, attachmentId, auth);

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
