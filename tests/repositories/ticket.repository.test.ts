import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketRepository } from "@/repositories/ticket.repository";
import type { PrismaClient } from "@prisma/client";

describe("TicketRepository", () => {
  const mockDb = {
    ticket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    timeEntry: {
      deleteMany: vi.fn(),
    },
    ticketObserver: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    ticketAttachment: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        timeEntry: mockDb.timeEntry,
        ticket: mockDb.ticket,
        ticketObserver: mockDb.ticketObserver,
        ticketAttachment: mockDb.ticketAttachment,
      }),
    ),
  };

  const accessInclude = {
    assignedTo: { select: { id: true, name: true } },
    observers: { select: { userId: true } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findMany applies optional filters", async () => {
    mockDb.ticket.findMany.mockResolvedValue([]);

    const repository = new TicketRepository(mockDb as unknown as PrismaClient);
    await repository.findMany({
      contractId: "contract-1",
      status: "OPEN",
      assignedToId: "user-1",
      priority: "HIGH",
      openedById: "user-2",
    });

    expect(mockDb.ticket.findMany).toHaveBeenCalledWith({
      where: {
        contractId: "contract-1",
        status: "OPEN",
        assignedToId: "user-1",
        priority: "HIGH",
        openedById: "user-2",
      },
      include: accessInclude,
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
    });
  });

  it("findMany scopes tickets accessible to a user including observers", async () => {
    mockDb.ticket.findMany.mockResolvedValue([]);

    const repository = new TicketRepository(mockDb as unknown as PrismaClient);
    await repository.findMany({ accessibleByUserId: "user-1" });

    expect(mockDb.ticket.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { assignedToId: "user-1" },
          {
            AND: [{ openedById: "user-1" }, { assignedToId: null }],
          },
          { observers: { some: { userId: "user-1" } } },
        ],
      },
      include: accessInclude,
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
    });
  });

  it("creates and updates tickets", async () => {
    mockDb.ticket.create.mockResolvedValue({ id: "ticket-1" });
    mockDb.ticket.update.mockResolvedValue({ id: "ticket-1" });
    mockDb.ticket.findUnique.mockResolvedValue(null);

    const repository = new TicketRepository(mockDb as unknown as PrismaClient);
    await repository.create({ title: "New ticket" });
    await repository.findById("ticket-1");
    await repository.update("ticket-1", { title: "Updated" });

    expect(mockDb.ticket.create).toHaveBeenCalled();
    expect(mockDb.ticket.findUnique).toHaveBeenCalledWith({
      where: { id: "ticket-1" },
      include: accessInclude,
    });
    expect(mockDb.ticket.update).toHaveBeenCalled();
  });

  it("replaces observers for a ticket", async () => {
    mockDb.ticketObserver.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.ticketObserver.createMany.mockResolvedValue({ count: 2 });

    const repository = new TicketRepository(mockDb as unknown as PrismaClient);
    await repository.replaceObservers("ticket-1", ["user-a", "user-b"]);

    expect(mockDb.ticketObserver.deleteMany).toHaveBeenCalledWith({ where: { ticketId: "ticket-1" } });
    expect(mockDb.ticketObserver.createMany).toHaveBeenCalledWith({
      data: [
        { ticketId: "ticket-1", userId: "user-a" },
        { ticketId: "ticket-1", userId: "user-b" },
      ],
    });
  });

  it("deletes attachments, time entries and observers before removing the ticket", async () => {
    mockDb.ticketAttachment.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.timeEntry.deleteMany.mockResolvedValue({ count: 2 });
    mockDb.ticketObserver.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.ticket.delete.mockResolvedValue({ id: "ticket-1" });

    const repository = new TicketRepository(mockDb as unknown as PrismaClient);
    await repository.delete("ticket-1");

    expect(mockDb.$transaction).toHaveBeenCalled();
    expect(mockDb.ticketAttachment.deleteMany).toHaveBeenCalledWith({ where: { ticketId: "ticket-1" } });
    expect(mockDb.timeEntry.deleteMany).toHaveBeenCalledWith({ where: { ticketId: "ticket-1" } });
    expect(mockDb.ticketObserver.deleteMany).toHaveBeenCalledWith({ where: { ticketId: "ticket-1" } });
    expect(mockDb.ticket.delete).toHaveBeenCalledWith({ where: { id: "ticket-1" } });
  });
});
