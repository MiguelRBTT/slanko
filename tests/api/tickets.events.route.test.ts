import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/tickets/[id]/events/route";
import { ticketService } from "@/services/ticket.service";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { ForbiddenError } from "@/lib/errors/app-error";

vi.mock("@/services/ticket.service", () => ({
  ticketService: {
    listEvents: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "ticket-1" }) };

const authHeaders = {
  [USER_ID_HEADER]: "user-tecnico",
  [USER_EMAIL_HEADER]: "tecnico@slanko.local",
  [USER_ROLE_HEADER]: "TECNICO",
};

describe("GET /api/tickets/:id/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the ticket history for the authenticated user", async () => {
    vi.mocked(ticketService.listEvents).mockResolvedValue([
      {
        id: "event-1",
        ticketId: "ticket-1",
        type: "CREATED",
        actorId: "user-gestor",
        actorName: "Ana Gestora",
        data: { status: "OPEN" },
        createdAt: "2026-08-19T10:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("http://localhost", { headers: authHeaders }), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.events).toHaveLength(1);
    expect(ticketService.listEvents).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({ userId: "user-tecnico", role: "TECNICO" }),
    );
  });

  it("returns 403 when the user cannot see the ticket", async () => {
    vi.mocked(ticketService.listEvents).mockRejectedValue(new ForbiddenError("Insufficient permissions"));

    const response = await GET(new Request("http://localhost", { headers: authHeaders }), routeContext);

    expect(response.status).toBe(403);
  });

  it("returns 401 without auth context", async () => {
    const response = await GET(new Request("http://localhost"), routeContext);

    expect(response.status).toBe(401);
  });
});
