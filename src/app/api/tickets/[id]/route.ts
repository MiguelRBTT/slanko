import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { ticketService } from "@/services/ticket.service";
import type { UpdateTicketInput } from "@/types/ticket";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tickets/:id - fetch ticket by id.
// PUT /api/tickets/:id - update, assign or close a ticket.

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const ticket = await ticketService.getTicketById(id, auth);

    return jsonOk({ ticket });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const body = (await request.json()) as UpdateTicketInput;
    const ticket = await ticketService.updateTicket(id, body, auth);

    return jsonOk({ ticket });
  } catch (error) {
    return jsonError(error);
  }
}
