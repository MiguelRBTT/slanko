import type { TicketPriority, TicketStatus } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { BadRequestError } from "@/lib/errors/app-error";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { ticketService } from "@/services/ticket.service";
import type { CreateTicketInput } from "@/types/ticket";

const TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"];
const TICKET_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function parseStatusFilter(value: string | null): TicketStatus | undefined {
  if (!value) {
    return undefined;
  }

  if (!TICKET_STATUSES.includes(value as TicketStatus)) {
    throw new BadRequestError("status filter is invalid");
  }

  return value as TicketStatus;
}

function parsePriorityFilter(value: string | null): TicketPriority | undefined {
  if (!value) {
    return undefined;
  }

  if (!TICKET_PRIORITIES.includes(value as TicketPriority)) {
    throw new BadRequestError("priority filter is invalid");
  }

  return value as TicketPriority;
}

// GET /api/tickets - list tickets (requires JWT; gestor or tecnico).
// POST /api/tickets - open a ticket.

export async function GET(request: Request) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contractId") ?? undefined;
    const status = parseStatusFilter(searchParams.get("status"));
    const assignedToId = searchParams.get("assignedToId") ?? undefined;
    const priority = parsePriorityFilter(searchParams.get("priority"));

    const tickets = await ticketService.listTickets(auth, {
      contractId,
      status,
      assignedToId,
      priority,
    });

    return jsonOk({ tickets });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const body = (await request.json()) as CreateTicketInput;
    const ticket = await ticketService.createTicket(body, auth);

    return jsonOk({ ticket }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
