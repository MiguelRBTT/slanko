import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { TimeEntryService } from "@/services/time-entry.service";
import type { TicketRepository } from "@/repositories/ticket.repository";
import type { TimeEntryRepository } from "@/repositories/time-entry.repository";

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
  title: "Servidor lento",
  description: "Usuarios reportam lentidao.",
  priority: "HIGH" as const,
  category: "Infraestrutura",
  status: "IN_PROGRESS" as const,
  openedAt: new Date("2026-08-19T10:00:00.000Z"),
  firstResponseAt: new Date("2026-08-19T10:30:00.000Z"),
  resolvedAt: null,
  closedAt: null,
  solution: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TimeEntryService", () => {
  const mockTimeEntries: TimeEntryRepository = {
    findByTicketId: vi.fn(),
    create: vi.fn(),
  };

  const mockTickets: TicketRepository = {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists time entries for an accessible ticket", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.findByTicketId).mockResolvedValue([
      {
        id: "entry-1",
        ticketId: "ticket-1",
        userId: "user-tecnico",
        hours: { toString: () => "2.5" },
        note: null,
        workedAt: new Date("2026-08-19T14:00:00.000Z"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const service = new TimeEntryService(mockTimeEntries, mockTickets);
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
      hours: { toString: () => "1.5" },
      note: "Diagnostico",
      workedAt: new Date("2026-08-19T14:00:00.000Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new TimeEntryService(mockTimeEntries, mockTickets);
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
  });

  it("allows gestor to access any ticket time entries", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(sampleTicket);
    vi.mocked(mockTimeEntries.findByTicketId).mockResolvedValue([]);

    const service = new TimeEntryService(mockTimeEntries, mockTickets);
    await service.listTimeEntries("ticket-1", gestorAuth);

    expect(mockTimeEntries.findByTicketId).toHaveBeenCalledWith("ticket-1");
  });

  it("rejects missing tickets, closed tickets and unauthorized users", async () => {
    const service = new TimeEntryService(mockTimeEntries, mockTickets);

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

    const service = new TimeEntryService(mockTimeEntries, mockTickets);
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
});
