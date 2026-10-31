import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "@/app/api/tickets/[id]/time-entries/[entryId]/route";
import { timeEntryService } from "@/services/time-entry.service";
import { ForbiddenError } from "@/lib/errors/app-error";
import { tecnicoRequest } from "../helpers/auth-request";

vi.mock("@/services/time-entry.service", () => ({
  timeEntryService: {
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "ticket-1", entryId: "entry-1" }) };

describe("PUT/DELETE /api/tickets/:id/time-entries/:entryId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("corrects a time entry", async () => {
    vi.mocked(timeEntryService.updateTimeEntry).mockResolvedValue({
      id: "entry-1",
      ticketId: "ticket-1",
      userId: "user-tecnico",
      hours: "0.5",
      note: null,
      workedAt: "2026-08-19T14:00:00.000Z",
    });

    const response = await PUT(
      tecnicoRequest("http://localhost", { method: "PUT", body: JSON.stringify({ hours: 0.5 }) }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(timeEntryService.updateTimeEntry).toHaveBeenCalledWith(
      "ticket-1",
      "entry-1",
      { hours: 0.5 },
      expect.objectContaining({ userId: "user-tecnico" }),
    );
  });

  it("deletes a time entry and maps permission errors", async () => {
    vi.mocked(timeEntryService.deleteTimeEntry).mockResolvedValueOnce(undefined);
    const ok = await DELETE(tecnicoRequest("http://localhost", { method: "DELETE" }), routeContext);
    expect(ok.status).toBe(200);

    vi.mocked(timeEntryService.deleteTimeEntry).mockRejectedValueOnce(new ForbiddenError("nope"));
    const forbidden = await DELETE(tecnicoRequest("http://localhost", { method: "DELETE" }), routeContext);
    expect(forbidden.status).toBe(403);
  });
});
