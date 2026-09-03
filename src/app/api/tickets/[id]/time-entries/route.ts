import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { timeEntryService } from "@/services/time-entry.service";
import type { CreateTimeEntryInput } from "@/types/time-entry";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/tickets/:id/time-entries - list time entries for a ticket.
// POST /api/tickets/:id/time-entries - log worked hours.

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const timeEntries = await timeEntryService.listTimeEntries(id, auth);

    return jsonOk({ timeEntries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const body = (await request.json()) as CreateTimeEntryInput;
    const timeEntry = await timeEntryService.createTimeEntry(id, body, auth);

    return jsonOk({ timeEntry }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
