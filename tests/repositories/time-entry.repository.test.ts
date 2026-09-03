import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimeEntryRepository } from "@/repositories/time-entry.repository";
import type { PrismaClient } from "@prisma/client";

describe("TimeEntryRepository", () => {
  const mockDb = {
    timeEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("create inserts a time entry", async () => {
    mockDb.timeEntry.create.mockResolvedValue({ id: "entry-1" });

    const repository = new TimeEntryRepository(mockDb as unknown as PrismaClient);
    await repository.create({ hours: 2 });

    expect(mockDb.timeEntry.create).toHaveBeenCalled();
  });
});
