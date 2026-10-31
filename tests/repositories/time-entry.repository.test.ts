import { beforeEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../helpers/fixtures";
import { TimeEntryRepository } from "@/repositories/time-entry.repository";
import type { PrismaClient } from "@prisma/client";

describe("TimeEntryRepository", () => {
  const mockDb = {
    timeEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticket: {
      updateMany: vi.fn(),
    },
    ticketEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const workedAt = new Date("2026-08-19T14:00:00.000Z");
  const createdAt = new Date("2026-08-19T15:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockDb) => unknown) =>
      callback(mockDb),
    );
  });

  it("findByTicketId lists entries ordered by workedAt", async () => {
    mockDb.timeEntry.findMany.mockResolvedValue([]);

    const repository = new TimeEntryRepository(mockDb as unknown as PrismaClient);
    await repository.findByTicketId("ticket-1");

    expect(mockDb.timeEntry.findMany).toHaveBeenCalledWith({
      where: { ticketId: "ticket-1" },
      orderBy: { workedAt: "desc" },
    });
  });

  it("findById loads a single entry", async () => {
    mockDb.timeEntry.findUnique.mockResolvedValue(null);

    const repository = new TimeEntryRepository(mockDb as unknown as PrismaClient);
    await repository.findById("entry-1");

    expect(mockDb.timeEntry.findUnique).toHaveBeenCalledWith({ where: { id: "entry-1" } });
  });

  it("create inserts the entry, marks the first response and logs the history event", async () => {
    mockDb.timeEntry.create.mockResolvedValue({
      id: "entry-1",
      hours: decimal("2"),
      workedAt,
      note: null,
      createdAt,
    });

    const data = {
      ticketId: "ticket-1",
      userId: "user-1",
      hours: 2,
      hourlyCost: 85.5,
      note: null,
      workedAt,
    };
    const repository = new TimeEntryRepository(mockDb as unknown as PrismaClient);
    const entry = await repository.create(data);

    expect(entry.id).toBe("entry-1");
    expect(mockDb.timeEntry.create).toHaveBeenCalledWith({ data });
    expect(mockDb.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: "ticket-1", firstResponseAt: null },
      data: { firstResponseAt: createdAt },
    });
    expect(mockDb.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        actorId: "user-1",
        type: "TIME_LOGGED",
        data: {
          timeEntryId: "entry-1",
          hours: "2",
          workedAt: workedAt.toISOString(),
          note: null,
        },
      },
    });
  });

  it("update records the values before and after the correction", async () => {
    mockDb.timeEntry.findUniqueOrThrow.mockResolvedValue({
      id: "entry-1",
      ticketId: "ticket-1",
      hours: decimal("2"),
      workedAt,
      note: null,
    });
    mockDb.timeEntry.update.mockResolvedValue({
      id: "entry-1",
      ticketId: "ticket-1",
      hours: decimal("0.5"),
      workedAt,
      note: "corrigido",
    });

    const repository = new TimeEntryRepository(mockDb as unknown as PrismaClient);
    await repository.update("entry-1", { hours: 0.5, note: "corrigido" }, "user-2");

    expect(mockDb.timeEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { hours: 0.5, note: "corrigido" },
    });
    expect(mockDb.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        actorId: "user-2",
        type: "TIME_UPDATED",
        data: {
          timeEntryId: "entry-1",
          from: { hours: "2", workedAt: workedAt.toISOString(), note: null },
          to: { hours: "0.5", workedAt: workedAt.toISOString(), note: "corrigido" },
        },
      },
    });
  });

  it("delete keeps the removed values in the history", async () => {
    mockDb.timeEntry.delete.mockResolvedValue({
      id: "entry-1",
      ticketId: "ticket-1",
      hours: decimal("2"),
      workedAt,
      note: "x",
    });

    const repository = new TimeEntryRepository(mockDb as unknown as PrismaClient);
    await repository.delete("entry-1", "user-2");

    expect(mockDb.timeEntry.delete).toHaveBeenCalledWith({ where: { id: "entry-1" } });
    expect(mockDb.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        actorId: "user-2",
        type: "TIME_DELETED",
        data: { timeEntryId: "entry-1", hours: "2", workedAt: workedAt.toISOString(), note: "x" },
      },
    });
  });
});
