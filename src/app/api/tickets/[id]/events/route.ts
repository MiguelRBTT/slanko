import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { ticketService } from "@/services/ticket.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tickets/:id/events - audit history of the ticket (RF07).

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const events = await ticketService.listEvents(id, auth);

    return jsonOk({ events });
  } catch (error) {
    return jsonError(error);
  }
}
