import { beforeEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../helpers/fixtures";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors/app-error";
import { TimeEntryService } from "@/services/time-entry.service";
import type { TicketRepository } from "@/repositories/ticket.repository";
import type { TimeEntryRepository } from "@/repositories/time-entry.repository";
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

const sampleTicket = {
  id: "ticket-1",
  contractId: "contract-1",
  openedById: "user-gestor",
  assignedToId: "user-tecnico",
  assignedTo: { id: "user-tecnico", name: "Carlos Tecnico" } as { id: string; name: string } | null,
  observers: [] as Array<{ userId: string }>,
  title: "Servidor lento",
  description: "Usuarios reportam lentidao.",
  priority: "HIGH" as const,
  category: "Infraestrutura",
  status: "IN_PROGRESS" as const,
  openedAt: new Date("2026-08-19T10:00:00.000Z"),
  responseMinutes: 60,
  resolutionMinutes: 480,
  firstResponseAt: new Date("2026-08-19T10:30:00.000Z"),
  resolvedAt: null,
  closedAt: null,
  solution: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const clock = () => new Date("2026-08-20T12:00:00.000Z");

const ownEntry = {
  id: "entry-1",
  ticketId: "ticket-1",
  userId: "user-tecnico",
  hours: decimal("1"),
  hourlyCost: decimal("85.50"),
  note: null,
  workedAt: new Date("2026-08-19T14:00:00.000Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TimeEntryService", () => {
  const mockTimeEntries = {
    findByTicketId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as TimeEntryRepository;

  const mockTickets = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as TicketRepository;

  const mockUsers = {
    findAllActive: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
  } as unknown as UserRepository;

  const tecnicoUser = {
    id: "user-tecnico",
    name: "Carlos Tecnico",
    email: "tecnico@slanko.local",
    passwordHash: "hash",
    role: "TECNICO" as const,
    hourlyCost: decimal("85.50"),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockUsers.findById).mockResolvedValue(tecnicoUser as never);
  });

  it("lists time entries for an accessible ticket", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.findByTicketId).mockResolvedValue([
      {
        id: "entry-1",
        ticketId: "ticket-1",
        userId: "user-tecnico",
        hours: decimal("2.5"),
        hourlyCost: decimal("85.50"),
        note: null,
        workedAt: new Date("2026-08-19T14:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    const entries = await service.listTimeEntries("ticket-1", tecnicoAuth);

    expect(entries).toHaveLength(1);
    expect(entries[0].hours).toBe("2.5");
  });

  it("creates a time entry for the authenticated user", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.create).mockResolvedValue({
      id: "entry-1",
      ticketId: "ticket-1",
      userId: "user-tecnico",
      hours: decimal("1.5"),
      hourlyCost: decimal("85.50"),
      note: "Diagnostico",
      workedAt: new Date("2026-08-19T14:00:00.000Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    const entry = await service.createTimeEntry(
      "ticket-1",
      {
        hours: 1.5,
        note: "Diagnostico",
        workedAt: "2026-08-19T14:00:00.000Z",
      },
      tecnicoAuth,
    );

    expect(entry.userId).toBe("user-tecnico");
    expect(mockTimeEntries.create).toHaveBeenCalledWith({
      ticketId: "ticket-1",
      userId: "user-tecnico",
      hours: 1.5,
      hourlyCost: 85.5,
      note: "Diagnostico",
      workedAt: new Date("2026-08-19T14:00:00.000Z"),
    });
  });

  it("rejects logging time for an inactive user", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockUsers.findById).mockResolvedValue({ ...tecnicoUser, active: false } as never);

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    await expect(
      service.createTimeEntry(
        "ticket-1",
        { hours: 1, workedAt: "2026-08-19T14:00:00.000Z" },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mockTimeEntries.create).not.toHaveBeenCalled();
  });

  it("allows gestor to access any ticket time entries", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.findByTicketId).mockResolvedValue([]);

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    await service.listTimeEntries("ticket-1", gestorAuth);

    expect(mockTimeEntries.findByTicketId).toHaveBeenCalledWith("ticket-1");
  });

  it("rejects missing tickets, closed tickets and unauthorized users", async () => {
    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);

    vi.mocked(mockTickets.findById).mockResolvedValue(null);
    await expect(service.listTimeEntries("missing", gestorAuth)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    await expect(
      service.createTimeEntry(
        "missing",
        { hours: 1, workedAt: "2026-08-19T14:00:00.000Z" },
        gestorAuth,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    await expect(service.listTimeEntries("ticket-1", otherTecnicoAuth)).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, status: "CLOSED" });
    await expect(
      service.createTimeEntry(
        "ticket-1",
        { hours: 1, workedAt: "2026-08-19T14:00:00.000Z" },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects invalid time entry payloads", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    await expect(
      service.createTimeEntry(
        "ticket-1",
        { hours: 0, workedAt: "2026-08-19T14:00:00.000Z" },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    await expect(
      service.createTimeEntry("ticket-1", { hours: 1, workedAt: "invalid" }, tecnicoAuth),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects work dates in the future, before the ticket or above 24 hours", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);

    await expect(
      service.createTimeEntry("ticket-1", { hours: 1, workedAt: "2026-08-25T12:00:00.000Z" }, tecnicoAuth),
    ).rejects.toThrow("workedAt cannot be in the future");

    await expect(
      service.createTimeEntry("ticket-1", { hours: 1, workedAt: "2026-08-10T12:00:00.000Z" }, tecnicoAuth),
    ).rejects.toThrow("workedAt cannot be before the ticket was opened");

    await expect(
      service.createTimeEntry("ticket-1", { hours: 25, workedAt: "2026-08-19T14:00:00.000Z" }, tecnicoAuth),
    ).rejects.toThrow("hours cannot exceed 24 per entry");

    expect(mockTimeEntries.create).not.toHaveBeenCalled();
  });

  it("accepts the opening day even when local noon is before the opening time in UTC", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.create).mockResolvedValue(ownEntry as never);
    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);

    await expect(
      service.createTimeEntry("ticket-1", { hours: 1, workedAt: "2026-08-19T09:00:00.000Z" }, tecnicoAuth),
    ).resolves.toMatchObject({ id: "entry-1" });
  });

  it("lets the author correct their own time entry", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.findById).mockResolvedValue(ownEntry as never);
    vi.mocked(mockTimeEntries.update).mockResolvedValue({ ...ownEntry, note: "ajuste" } as never);

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    await service.updateTimeEntry(
      "ticket-1",
      "entry-1",
      { hours: 0.5, note: "ajuste", workedAt: "2026-08-20T12:00:00.000Z" },
      tecnicoAuth,
    );

    expect(mockTimeEntries.update).toHaveBeenCalledWith(
      "entry-1",
      { hours: 0.5, note: "ajuste", workedAt: new Date("2026-08-20T12:00:00.000Z") },
      "user-tecnico",
    );
  });

  it("lets the gestor delete any entry and blocks other technicians", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, assignedToId: "user-other" });
    vi.mocked(mockTimeEntries.findById).mockResolvedValue(ownEntry as never);

    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);
    await service.deleteTimeEntry("ticket-1", "entry-1", gestorAuth);
    expect(mockTimeEntries.delete).toHaveBeenCalledWith("entry-1", "user-gestor");

    await expect(
      service.deleteTimeEntry("ticket-1", "entry-1", otherTecnicoAuth),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses corrections on closed tickets or entries from another ticket", async () => {
    const service = new TimeEntryService(mockTimeEntries, mockTickets, mockUsers, clock);

    vi.mocked(mockTickets.findById).mockResolvedValue({ ...sampleTicket, status: "CLOSED" });
    await expect(
      service.updateTimeEntry("ticket-1", "entry-1", { hours: 1 }, tecnicoAuth),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.findById).mockResolvedValue({ ...ownEntry, ticketId: "ticket-2" } as never);
    await expect(service.deleteTimeEntry("ticket-1", "entry-1", tecnicoAuth)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(mockTimeEntries.update).not.toHaveBeenCalled();
    expect(mockTimeEntries.delete).not.toHaveBeenCalled();
  });
});
