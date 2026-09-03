import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "@/app/api/tickets/[id]/route";
import { ticketService } from "@/services/ticket.service";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { ForbiddenError, NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/ticket.service", () => ({
  ticketService: {
    getTicketById: vi.fn(),
    updateTicket: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "ticket-1" }) };

const authHeaders = {
  [USER_ID_HEADER]: "user-tecnico",
  [USER_EMAIL_HEADER]: "tecnico@slanko.local",
  [USER_ROLE_HEADER]: "TECNICO",
};

const sampleTicket = {
  id: "ticket-1",
  contractId: "contract-1",
  openedById: "user-gestor",
  assignedToId: "user-tecnico",
  title: "Servidor lento",
  description: "Usuarios reportam lentidao.",
  priority: "HIGH" as const,
  category: "Infraestrutura",
  status: "OPEN" as const,
  openedAt: "2026-08-19T10:00:00.000Z",
  firstResponseAt: null,
  resolvedAt: null,
  closedAt: null,
  solution: null,
};

describe("GET /api/tickets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a ticket by id", async () => {
    vi.mocked(ticketService.getTicketById).mockResolvedValue(sampleTicket);

    const response = await GET(
      new Request("http://localhost", { headers: authHeaders }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.id).toBe("ticket-1");
  });

  it("returns 404 when ticket is not found", async () => {
    vi.mocked(ticketService.getTicketById).mockRejectedValue(new NotFoundError("Ticket not found"));

    const response = await GET(
      new Request("http://localhost", { headers: authHeaders }),
      routeContext,
    );

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/tickets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a ticket", async () => {
    vi.mocked(ticketService.updateTicket).mockResolvedValue({
      ...sampleTicket,
      status: "RESOLVED",
      solution: "Reiniciado o servico",
    });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          status: "RESOLVED",
          solution: "Reiniciado o servico",
        }),
      }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ticket.status).toBe("RESOLVED");
  });

  it("returns 403 when update is forbidden", async () => {
    vi.mocked(ticketService.updateTicket).mockRejectedValue(
      new ForbiddenError("Insufficient permissions"),
    );

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ title: "Updated" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(403);
  });
});
