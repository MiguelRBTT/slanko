import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { TicketService } from "@/services/ticket.service";
import type { ContractRepository } from "@/repositories/contract.repository";
import type { TicketRepository } from "@/repositories/ticket.repository";
import type { UserRepository } from "@/repositories/user.repository";

const gestorAuth = {
  userId: "user-gestor",
  email: "gestor@slanko.local",
  role: "GESTOR" as const,
};

const tecnicoAuth = {
  userId: "user-tecnico",
  email: "tecnico@slanko.local",
  role: "TECNICO" as const,
};

const otherTecnicoAuth = {
  userId: "user-other",
  email: "other@slanko.local",
  role: "TECNICO" as const,
};

const activeContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-001",
  title: "Suporte",
  description: null,
  value: { toString: () => "1000" },
  startDate: new Date("2026-01-01"),
  endDate: null,
  status: "ACTIVE" as const,
  responseMinutes: 60,
  resolutionMinutes: 480,
  createdAt: new Date(),
  updatedAt: new Date(),
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
  openedAt: new Date("2026-08-19T10:00:00.000Z"),
  firstResponseAt: null,
  resolvedAt: null,
  closedAt: null,
  solution: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeUser = {
  id: "user-tecnico",
  name: "Carlos Tecnico",
  email: "tecnico@slanko.local",
  passwordHash: "hash",
  role: "TECNICO" as const,
  hourlyCost: { toString: () => "85.5" },
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TicketService", () => {
  const mockTickets: TicketRepository = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockContracts: ContractRepository = {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countTickets: vi.fn(),
  };

  const mockUsers: UserRepository = {
    findAllActive: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all tickets for gestor and scoped tickets for tecnico", async () => {
    vi.mocked(mockTickets.findMany).mockResolvedValue([sampleTicket]);

    const service = new TicketService(mockTickets, mockContracts, mockUsers);

    await service.listTickets(gestorAuth, { status: "OPEN" });
    expect(mockTickets.findMany).toHaveBeenCalledWith({ status: "OPEN" });

    await service.listTickets(tecnicoAuth, { status: "OPEN" });
    expect(mockTickets.findMany).toHaveBeenLastCalledWith({
      status: "OPEN",
      accessibleByUserId: "user-tecnico",
    });
  });

  it("returns a ticket when the user has access", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    const ticket = await service.getTicketById("ticket-1", tecnicoAuth);

    expect(ticket.id).toBe("ticket-1");
  });

  it("throws when ticket is missing or inaccessible", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    const service = new TicketService(mockTickets, mockContracts, mockUsers);

    await expect(service.getTicketById("missing", gestorAuth)).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(service.getTicketById("ticket-1", otherTecnicoAuth)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("creates a ticket without an assignee", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    vi.mocked(mockTickets.create).mockResolvedValue({
      ...sampleTicket,
      assignedToId: null,
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.createTicket(
      {
        contractId: "contract-1",
        title: "Servidor lento",
        description: "Usuarios reportam lentidao.",
        priority: "HIGH",
        category: "Infraestrutura",
      },
      tecnicoAuth,
    );

    expect(mockTickets.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ firstResponseAt: expect.any(Date) }),
    );
  });

  it("creates a ticket for an active contract", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.create).mockResolvedValue(sampleTicket);

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    const ticket = await service.createTicket(
      {
        contractId: "contract-1",
        title: "Servidor lento",
        description: "Usuarios reportam lentidao.",
        priority: "HIGH",
        category: "Infraestrutura",
        assignedToId: "user-tecnico",
      },
      gestorAuth,
    );

    expect(ticket.title).toBe("Servidor lento");
  });

  it("rejects invalid create payloads and assignments by tecnico", async () => {
    const service = new TicketService(mockTickets, mockContracts, mockUsers);

    vi.mocked(mockContracts.findById).mockResolvedValue(null);
    await expect(
      service.createTicket(
        {
          contractId: "missing",
          title: "Servidor lento",
          description: "Detalhes",
          priority: "HIGH",
          category: "Infra",
        },
        gestorAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    await expect(
      service.createTicket(
        {
          contractId: "contract-1",
          title: "Servidor lento",
          description: "Detalhes",
          priority: "HIGH",
          category: "Infra",
          assignedToId: "user-tecnico",
        },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates individual ticket fields and closes tickets", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      status: "RESOLVED",
      solution: "Corrigido",
      resolvedAt: new Date("2026-08-19T12:00:00.000Z"),
    });
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      status: "CLOSED",
      closedAt: new Date("2026-08-19T13:00:00.000Z"),
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.updateTicket(
      "ticket-1",
      {
        title: "Novo titulo",
        description: "Nova descricao",
        priority: "CRITICAL",
        category: "Rede",
        status: "CLOSED",
      },
      gestorAuth,
    );

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        title: "Novo titulo",
        description: "Nova descricao",
        priority: "CRITICAL",
        category: "Rede",
        status: "CLOSED",
        closedAt: expect.any(Date),
      }),
    );
  });

  it("sets first response timestamp when moving to in progress", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      status: "IN_PROGRESS",
      firstResponseAt: new Date("2026-08-19T11:00:00.000Z"),
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.updateTicket("ticket-1", { status: "IN_PROGRESS" }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        status: "IN_PROGRESS",
        firstResponseAt: expect.any(Date),
      }),
    );
  });

  it("assigns tickets to an active user", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, assignedToId: null });
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      assignedToId: "user-tecnico",
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.updateTicket("ticket-1", { assignedToId: "user-tecnico" }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        assignedTo: { connect: { id: "user-tecnico" } },
      }),
    );
  });

  it("updates ticket fields and sla timestamps", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      status: "RESOLVED",
      solution: "Reiniciado o servico",
      resolvedAt: new Date("2026-08-19T12:00:00.000Z"),
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    const ticket = await service.updateTicket(
      "ticket-1",
      {
        status: "RESOLVED",
        solution: "Reiniciado o servico",
      },
      tecnicoAuth,
    );

    expect(ticket.status).toBe("RESOLVED");
    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        status: "RESOLVED",
        solution: "Reiniciado o servico",
        resolvedAt: expect.any(Date),
      }),
    );
  });

  it("handles update validation and permissions", async () => {
    const service = new TicketService(mockTickets, mockContracts, mockUsers);

    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    await expect(
      service.updateTicket("missing", { title: "Updated" }, gestorAuth),
    ).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, status: "CLOSED" });
    await expect(
      service.updateTicket("ticket-1", { title: "Updated" }, gestorAuth),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(
      service.updateTicket("ticket-1", { assignedToId: "user-tecnico" }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(
      service.updateTicket("ticket-1", { status: "RESOLVED" }, tecnicoAuth),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockUsers.findById).mockResolvedValue(null);
    await expect(
      service.updateTicket("ticket-1", { assignedToId: "missing" }, gestorAuth),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("clears stale closed timestamps when ticket is not closed", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      status: "IN_PROGRESS",
      closedAt: new Date("2026-08-19T13:00:00.000Z"),
    });
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      status: "WAITING",
      closedAt: null,
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.updateTicket("ticket-1", { status: "WAITING" }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        status: "WAITING",
        closedAt: null,
      }),
    );
  });

  it("clears resolved timestamps when reopening a ticket", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      status: "RESOLVED",
      solution: "Corrigido",
      resolvedAt: new Date("2026-08-19T12:00:00.000Z"),
    });
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      status: "IN_PROGRESS",
      resolvedAt: null,
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.updateTicket("ticket-1", { status: "IN_PROGRESS" }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        status: "IN_PROGRESS",
        resolvedAt: null,
      }),
    );
  });

  it("assigns and unassigns tickets for gestor", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.update).mockResolvedValue({
      ...sampleTicket,
      assignedToId: null,
    });

    const service = new TicketService(mockTickets, mockContracts, mockUsers);
    await service.updateTicket("ticket-1", { assignedToId: null }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({ assignedTo: { disconnect: true } }),
    );
  });

  it("rejects invalid priority and status values", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    const service = new TicketService(mockTickets, mockContracts, mockUsers);

    await expect(
      service.createTicket(
        {
          contractId: "contract-1",
          title: "Servidor lento",
          description: "Detalhes",
          priority: "INVALID" as "HIGH",
          category: "Infra",
        },
        gestorAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(
      service.updateTicket("ticket-1", { status: "INVALID" as "OPEN" }, gestorAuth),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
