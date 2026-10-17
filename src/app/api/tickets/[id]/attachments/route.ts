import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { BadRequestError } from "@/lib/errors/app-error";
import { ticketAttachmentService } from "@/services/ticket-attachment.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

// GET /api/tickets/:id/attachments
// POST /api/tickets/:id/attachments (multipart: file)

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const attachments = await ticketAttachmentService.listAttachments(id, auth);

    return jsonOk({ attachments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new BadRequestError("file is required");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const attachment = await ticketAttachmentService.createAttachment(
      id,
      {
        bytes,
        fileName: file.name || "upload",
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
      auth,
    );

    return jsonOk({ attachment }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
