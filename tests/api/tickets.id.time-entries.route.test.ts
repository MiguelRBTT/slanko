import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/tickets/[id]/time-entries/route";
import { timeEntryService } from "@/services/time-entry.service";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { BadRequestError, NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/time-entry.service", () => ({
  timeEntryService: {
    listTimeEntries: vi.fn(),
    createTimeEntry: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "ticket-1" }) };

const authHeaders = {
  [USER_ID_HEADER]: "user-tecnico",
  [USER_EMAIL_HEADER]: "tecnico@slanko.local",
  [USER_ROLE_HEADER]: "TECNICO",
};

const sampleEntry = {
  id: "entry-1",
  ticketId: "ticket-1",
  userId: "user-tecnico",
  hours: "1.50",
  note: "Diagnostico",
  workedAt: "2026-08-19T14:00:00.000Z",
};

describe("GET /api/tickets/:id/time-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns time entries for a ticket", async () => {
    vi.mocked(timeEntryService.listTimeEntries).mockResolvedValue([sampleEntry]);

    const response = await GET(
      new Request("http://localhost", { headers: authHeaders }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.timeEntries).toHaveLength(1);
  });

  it("returns 404 when ticket is not found", async () => {
    vi.mocked(timeEntryService.listTimeEntries).mockRejectedValue(
      new NotFoundError("Ticket not found"),
    );

    const response = await GET(
      new Request("http://localhost", { headers: authHeaders }),
      routeContext,
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/time-entries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a time entry and returns 201", async () => {
    vi.mocked(timeEntryService.createTimeEntry).mockResolvedValue(sampleEntry);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          hours: 1.5,
          note: "Diagnostico",
          workedAt: "2026-08-19T14:00:00.000Z",
        }),
      }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.timeEntry.id).toBe("entry-1");
  });

  it("returns validation errors from the service", async () => {
    vi.mocked(timeEntryService.createTimeEntry).mockRejectedValue(
      new BadRequestError("Cannot log hours on a closed ticket"),
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          hours: 1,
          workedAt: "2026-08-19T14:00:00.000Z",
        }),
      }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot log hours on a closed ticket");
  });
});
