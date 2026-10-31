import { beforeEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../helpers/fixtures";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { TicketService } from "@/services/ticket.service";
import type { TicketAttachmentService } from "@/services/ticket-attachment.service";
import type { ContractRepository } from "@/repositories/contract.repository";
import type { TicketEventRepository } from "@/repositories/ticket-event.repository";
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
  value: decimal("1000"),
  startDate: new Date("2026-01-01"),
  endDate: null as Date | null,
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
  assignedTo: { id: "user-tecnico", name: "Carlos Tecnico" },
  observers: [] as Array<{ userId: string }>,
  title: "Servidor lento",
  description: "Usuarios reportam lentidao.",
  priority: "HIGH" as const,
  category: "Infraestrutura",
  status: "OPEN" as const,
  openedAt: new Date("2026-08-19T10:00:00.000Z"),
  responseMinutes: 60,
  resolutionMinutes: 480,
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
  hourlyCost: decimal("85.5"),
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TicketService", () => {
  const mockTickets = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    countTimeEntries: vi.fn(),
    sumLoggedHours: vi.fn(async () => new Map<string, string>()),
    delete: vi.fn(),
  } as unknown as TicketRepository;

  const mockContracts = {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countTickets: vi.fn(),
  } as unknown as ContractRepository;

  const mockUsers = {
    findAllActive: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
  } as unknown as UserRepository;

  const mockAttachments = {
    listAttachments: vi.fn(),
    createAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    getAttachmentFile: vi.fn(),
    deleteAllForTicket: vi.fn(),
  } as unknown as TicketAttachmentService;

  const mockEvents = {
    findByTicketId: vi.fn(),
  } as unknown as TicketEventRepository;

  function makeService() {
    return new TicketService(mockTickets, mockContracts, mockUsers, mockAttachments, mockEvents);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all tickets for gestor and scoped tickets for tecnico", async () => {
    vi.mocked(mockTickets.findMany).mockResolvedValue([sampleTicket]);

    const service = makeService();

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

    const service = makeService();
    const ticket = await service.getTicketById("ticket-1", tecnicoAuth);

    expect(ticket.id).toBe("ticket-1");
  });

  it("throws when ticket is missing or inaccessible", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    const service = makeService();

    await expect(service.getTicketById("missing", gestorAuth)).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(service.getTicketById("ticket-1", otherTecnicoAuth)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("allows observers to access a ticket", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      assignedToId: "user-tecnico",
      observers: [{ userId: "user-other" }],
    });

    const service = makeService();
    const ticket = await service.getTicketById("ticket-1", otherTecnicoAuth);

    expect(ticket.observerIds).toEqual(["user-other"]);
  });

  it("keeps opener access only while the ticket has no assignee", async () => {
    const service = makeService();

    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      openedById: "user-other",
      assignedToId: null,
      assignedTo: null,
    });
    await expect(service.getTicketById("ticket-1", otherTecnicoAuth)).resolves.toMatchObject({
      id: "ticket-1",
    });

    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      openedById: "user-other",
      assignedToId: "user-tecnico",
      assignedTo: { id: "user-tecnico", name: "Carlos Tecnico" },
    });
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

    const service = makeService();
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

    const service = makeService();
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

  it("rejects invalid create payloads and allows assignment by tecnico", async () => {
    const service = makeService();

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
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.create).mockResolvedValue(sampleTicket);
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
    ).resolves.toMatchObject({ assignedToId: "user-tecnico" });
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

    const service = makeService();
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

    const service = makeService();
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

    const service = makeService();
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

    const service = makeService();
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
    const service = makeService();

    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    await expect(
      service.updateTicket("missing", { title: "Updated" }, gestorAuth),
    ).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, status: "CLOSED" });
    await expect(
      service.updateTicket("ticket-1", { title: "Updated" }, gestorAuth),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);
    await expect(
      service.updateTicket("ticket-1", { assignedToId: "user-tecnico" }, tecnicoAuth),
    ).resolves.toMatchObject({ assignedToId: "user-tecnico" });

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

    const service = makeService();
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

    const service = makeService();
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

    const service = makeService();
    await service.updateTicket("ticket-1", { assignedToId: null }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({ assignedTo: { disconnect: true } }),
    );
  });

  it("rejects invalid priority and status values", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    const service = makeService();

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

  it("deletes a ticket when the user has access", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTickets.countTimeEntries).mockResolvedValue(0);
    vi.mocked(mockTickets.delete).mockResolvedValue(undefined);
    vi.mocked(mockAttachments.deleteAllForTicket).mockResolvedValue(undefined);

    const service = makeService();
    await service.deleteTicket("ticket-1", tecnicoAuth);

    expect(mockAttachments.deleteAllForTicket).toHaveBeenCalledWith("ticket-1");
    expect(mockTickets.delete).toHaveBeenCalledWith("ticket-1");
  });

  it("rejects delete when ticket is missing or forbidden", async () => {
    const service = makeService();

    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    await expect(service.deleteTicket("missing", gestorAuth)).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(service.deleteTicket("ticket-1", otherTecnicoAuth)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("refuses to delete tickets that are part of the SLA or profitability history", async () => {
    const service = makeService();

    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      status: "RESOLVED",
      solution: "Corrigido",
    });
    await expect(service.deleteTicket("ticket-1", gestorAuth)).rejects.toBeInstanceOf(ConflictError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTickets.countTimeEntries).mockResolvedValue(2);
    await expect(service.deleteTicket("ticket-1", gestorAuth)).rejects.toBeInstanceOf(ConflictError);

    expect(mockAttachments.deleteAllForTicket).not.toHaveBeenCalled();
    expect(mockTickets.delete).not.toHaveBeenCalled();
  });

  it("records a CREATED event in the same write as the ticket", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.create).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.createTicket(
      {
        contractId: "contract-1",
        title: "Servidor lento",
        description: "Detalhes",
        priority: "HIGH",
        category: "Infra",
        assignedToId: "user-tecnico",
      },
      gestorAuth,
    );

    expect(mockTickets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        events: {
          createMany: { data: [
            {
              type: "CREATED",
              data: {
                status: "OPEN",
                priority: "HIGH",
                assignedTo: { id: "user-tecnico", name: "Carlos Tecnico" },
                observerIds: [],
                responseMinutes: 60,
                resolutionMinutes: 480,
              },
              actorId: "user-gestor",
            },
          ] },
        },
      }),
    );
  });

  it("records status, assignee and field changes as history events", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, assignedToId: null, assignedTo: null });
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.updateTicket(
      "ticket-1",
      { status: "IN_PROGRESS", assignedToId: "user-tecnico", title: "Servidor muito lento" },
      gestorAuth,
    );

    const [, data] = vi.mocked(mockTickets.update).mock.calls[0];
    expect(data.events).toEqual({
      createMany: { data: [
        {
          type: "STATUS_CHANGED",
          data: { from: "OPEN", to: "IN_PROGRESS" },
          actorId: "user-gestor",
        },
        {
          type: "ASSIGNEE_CHANGED",
          data: { from: null, to: { id: "user-tecnico", name: "Carlos Tecnico" } },
          actorId: "user-gestor",
        },
        {
          type: "UPDATED",
          data: { fields: { title: { from: "Servidor lento", to: "Servidor muito lento" } } },
          actorId: "user-gestor",
        },
      ] },
    });
  });

  it("replaces observers in the same write and records the change", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      observers: [{ userId: "user-old" }],
    });
    vi.mocked(mockUsers.findById).mockResolvedValue({ ...activeUser, id: "user-new" });
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.updateTicket("ticket-1", { observerIds: ["user-new"] }, gestorAuth);

    const [, data] = vi.mocked(mockTickets.update).mock.calls[0];
    expect(data.observers).toEqual({
      deleteMany: {},
      create: [{ user: { connect: { id: "user-new" } } }],
    });
    expect(data.events).toEqual({
      createMany: { data: [
        {
          type: "OBSERVERS_CHANGED",
          data: { added: ["user-new"], removed: ["user-old"] },
          actorId: "user-gestor",
        },
      ] },
    });
  });

  it("does not write events when nothing changed", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.updateTicket("ticket-1", { title: "Servidor lento" }, gestorAuth);

    const [, data] = vi.mocked(mockTickets.update).mock.calls[0];
    expect(data).not.toHaveProperty("events");
    expect(data).not.toHaveProperty("observers");
  });

  it("rejects a non-string assignee", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);

    const service = makeService();
    await expect(
      service.updateTicket("ticket-1", { assignedToId: 42 as never }, gestorAuth),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("lists the history of an accessible ticket", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockEvents.findByTicketId).mockResolvedValue([
      {
        id: "event-1",
        ticketId: "ticket-1",
        actorId: "user-gestor",
        actor: { name: "Ana Gestora" },
        type: "CREATED",
        data: { status: "OPEN" },
        createdAt: new Date("2026-08-19T10:00:00.000Z"),
      },
    ] as never);

    const service = makeService();
    const events = await service.listEvents("ticket-1", tecnicoAuth);

    expect(events).toEqual([
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
  });

  it("protects the ticket history with the same access rule", async () => {
    const service = makeService();

    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    await expect(service.listEvents("missing", gestorAuth)).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(service.listEvents("ticket-1", otherTecnicoAuth)).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockEvents.findByTicketId).not.toHaveBeenCalled();
  });

  it("does not count assignment alone as the first response", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.create).mockResolvedValue(sampleTicket);
    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, assignedToId: null, assignedTo: null });
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.createTicket(
      {
        contractId: "contract-1",
        title: "Servidor lento",
        description: "Detalhes",
        priority: "HIGH",
        category: "Infra",
        assignedToId: "user-tecnico",
      },
      gestorAuth,
    );
    expect(vi.mocked(mockTickets.create).mock.calls[0][0]).not.toHaveProperty("firstResponseAt");

    await service.updateTicket("ticket-1", { assignedToId: "user-tecnico" }, gestorAuth);
    expect(vi.mocked(mockTickets.update).mock.calls[0][1]).not.toHaveProperty("firstResponseAt");
  });

  it("closing directly also records the resolution time", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      status: "IN_PROGRESS",
      solution: "Feito",
    });
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.updateTicket("ticket-1", { status: "CLOSED" }, gestorAuth);

    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({ closedAt: expect.any(Date), resolvedAt: expect.any(Date) }),
    );
  });

  it("only opens tickets on contracts in effect today", async () => {
    const service = makeService();
    const create = (contract: typeof activeContract) => {
      vi.mocked(mockContracts.findById).mockResolvedValue(contract);
      return service.createTicket(
        { contractId: "contract-1", title: "T", description: "D", priority: "LOW", category: "C" },
        gestorAuth,
      );
    };

    await expect(create({ ...activeContract, startDate: new Date("2999-01-01") })).rejects.toThrow(
      "Contract is not in effect today",
    );
    await expect(
      create({ ...activeContract, startDate: new Date("2020-01-01"), endDate: new Date("2020-12-31") }),
    ).rejects.toThrow("Contract is not in effect today");
    expect(mockTickets.create).not.toHaveBeenCalled();
  });

  it("lets a tecnico claim an unassigned ticket but not assign it to others", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      openedById: "user-tecnico",
      assignedToId: null,
      assignedTo: null,
    });
    vi.mocked(mockUsers.findById).mockResolvedValue(activeUser);
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);

    const service = makeService();
    await expect(
      service.updateTicket("ticket-1", { assignedToId: "user-other" }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await service.updateTicket("ticket-1", { assignedToId: "user-tecnico" }, tecnicoAuth);
    expect(mockTickets.update).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({ assignedTo: { connect: { id: "user-tecnico" } } }),
    );
  });

  it("does not let a tecnico reassign, unassign or change observers", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...sampleTicket,
      observers: [{ userId: "user-a" }],
    });

    const service = makeService();
    await expect(
      service.updateTicket("ticket-1", { assignedToId: null }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.updateTicket("ticket-1", { assignedToId: "user-other" }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.updateTicket("ticket-1", { observerIds: ["user-b"] }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockTickets.update).not.toHaveBeenCalled();

    // Reenviar os mesmos observadores (sem mudança) é aceito.
    vi.mocked(mockTickets.update).mockResolvedValue(sampleTicket);
    await service.updateTicket("ticket-1", { observerIds: ["user-a"], title: "Novo" }, tecnicoAuth);
    expect(mockTickets.update).toHaveBeenCalledTimes(1);
  });

  it("does not let a tecnico assign others or set observers when opening a ticket", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(activeContract);
    const service = makeService();
    const base = { contractId: "contract-1", title: "T", description: "D", priority: "LOW" as const, category: "C" };

    await expect(
      service.createTicket({ ...base, assignedToId: "user-other" }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.createTicket({ ...base, observerIds: ["user-a"] }, tecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockTickets.create).not.toHaveBeenCalled();
  });

  it("freezes the contract SLA targets on the new ticket", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue({
      ...activeContract,
      responseMinutes: 30,
      resolutionMinutes: 240,
    });
    vi.mocked(mockTickets.create).mockResolvedValue(sampleTicket);

    const service = makeService();
    await service.createTicket(
      { contractId: "contract-1", title: "T", description: "D", priority: "LOW", category: "C" },
      gestorAuth,
    );

    expect(mockTickets.create).toHaveBeenCalledWith(
      expect.objectContaining({ responseMinutes: 30, resolutionMinutes: 240 }),
    );
  });

  it("adds the total logged hours to each listed ticket in a single query", async () => {
    vi.mocked(mockTickets.findMany).mockResolvedValue([sampleTicket, { ...sampleTicket, id: "ticket-2" }]);
    vi.mocked(mockTickets.sumLoggedHours).mockResolvedValue(new Map([["ticket-1", "1.5"]]));

    const service = makeService();
    const tickets = await service.listTickets(gestorAuth);

    expect(mockTickets.sumLoggedHours).toHaveBeenCalledWith(["ticket-1", "ticket-2"]);
    expect(tickets.map((ticket) => ticket.loggedHours)).toEqual(["1.5", "0"]);
  });
});
