import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/tickets/route";
import { ticketService } from "@/services/ticket.service";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { BadRequestError } from "@/lib/errors/app-error";

vi.mock("@/services/ticket.service", () => ({
  ticketService: {
    listTickets: vi.fn(),
    createTicket: vi.fn(),
  },
}));

const authHeaders = {
  [USER_ID_HEADER]: "user-gestor",
  [USER_EMAIL_HEADER]: "gestor@slanko.local",
  [USER_ROLE_HEADER]: "GESTOR",
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

describe("GET /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tickets with optional filters", async () => {
    vi.mocked(ticketService.listTickets).mockResolvedValue([sampleTicket]);

    const response = await GET(
      new Request("http://localhost/api/tickets?contractId=contract-1&status=OPEN&priority=HIGH", {
        headers: authHeaders,
      }),
    );
    const body = await response.json();

    expect(ticketService.listTickets).toHaveBeenCalledWith(
      expect.objectContaining({ role: "GESTOR" }),
      {
        contractId: "contract-1",
        status: "OPEN",
        assignedToId: undefined,
        priority: "HIGH",
      },
    );
    expect(response.status).toBe(200);
    expect(body.tickets).toHaveLength(1);
  });

  it("returns tickets without filters", async () => {
    vi.mocked(ticketService.listTickets).mockResolvedValue([sampleTicket]);

    const response = await GET(
      new Request("http://localhost/api/tickets", {
        headers: authHeaders,
      }),
    );

    expect(ticketService.listTickets).toHaveBeenCalledWith(expect.any(Object), {
      contractId: undefined,
      status: undefined,
      assignedToId: undefined,
      priority: undefined,
    });
    expect(response.status).toBe(200);
  });

  it("returns 400 for invalid status filter", async () => {
    const response = await GET(
      new Request("http://localhost/api/tickets?status=INVALID", {
        headers: authHeaders,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("status filter is invalid");
  });

  it("returns 400 for invalid priority filter", async () => {
    const response = await GET(
      new Request("http://localhost/api/tickets?priority=INVALID", {
        headers: authHeaders,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("priority filter is invalid");
  });
});

describe("POST /api/tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a ticket and returns 201", async () => {
    vi.mocked(ticketService.createTicket).mockResolvedValue(sampleTicket);

    const response = await POST(
      new Request("http://localhost/api/tickets", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          contractId: "contract-1",
          title: "Servidor lento",
          description: "Usuarios reportam lentidao.",
          priority: "HIGH",
          category: "Infraestrutura",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ticket.id).toBe("ticket-1");
  });

  it("returns validation errors from the service", async () => {
    vi.mocked(ticketService.createTicket).mockRejectedValue(
      new BadRequestError("Contract not found or not active"),
    );

    const response = await POST(
      new Request("http://localhost/api/tickets", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ contractId: "missing" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Contract not found or not active");
  });
});
