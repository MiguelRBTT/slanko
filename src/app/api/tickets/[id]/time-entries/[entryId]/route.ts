import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { timeEntryService } from "@/services/time-entry.service";
import type { UpdateTimeEntryInput } from "@/types/time-entry";

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

// PUT /api/tickets/:id/time-entries/:entryId - correct a time entry (author or gestor).
// DELETE /api/tickets/:id/time-entries/:entryId - remove a time entry (author or gestor).

export async function PUT(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id, entryId } = await context.params;
    const body = await readJsonBody<UpdateTimeEntryInput>(request);
    const timeEntry = await timeEntryService.updateTimeEntry(id, entryId, body, auth);

    return jsonOk({ timeEntry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id, entryId } = await context.params;
    await timeEntryService.deleteTimeEntry(id, entryId, auth);

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
