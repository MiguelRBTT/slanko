import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlaRepository } from "@/repositories/sla.repository";
import type { PrismaClient } from "@prisma/client";

describe("SlaRepository", () => {
  const mockDb = {
    ticket: {
      findMany: vi.fn(),
    },
    contract: {
      findFirst: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findTickets works without optional filters", async () => {
    mockDb.ticket.findMany.mockResolvedValue([]);

    const repository = new SlaRepository(mockDb as unknown as PrismaClient);
    await repository.findTickets();

    expect(mockDb.ticket.findMany).toHaveBeenCalledWith({
      where: { contract: { status: "ACTIVE" } },
      include: { contract: true },
      orderBy: { openedAt: "desc" },
    });
  });

  it("findTickets applies SLA filters on active contracts", async () => {
    mockDb.ticket.findMany.mockResolvedValue([]);

    const repository = new SlaRepository(mockDb as unknown as PrismaClient);
    await repository.findTickets({
      contractId: "contract-1",
      clientId: "client-1",
      openedFrom: new Date("2026-08-01T00:00:00.000Z"),
      openedTo: new Date("2026-08-31T23:59:59.999Z"),
    });

    expect(mockDb.ticket.findMany).toHaveBeenCalledWith({
      where: {
        contractId: "contract-1",
        contract: { status: "ACTIVE", clientId: "client-1" },
        openedAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lte: new Date("2026-08-31T23:59:59.999Z"),
        },
      },
      include: { contract: true },
      orderBy: { openedAt: "desc" },
    });
  });

  it("findTickets supports partial openedAt filters", async () => {
    mockDb.ticket.findMany.mockResolvedValue([]);

    const repository = new SlaRepository(mockDb as unknown as PrismaClient);
    await repository.findTickets({ openedFrom: new Date("2026-08-01T00:00:00.000Z") });
    await repository.findTickets({ openedTo: new Date("2026-08-31T23:59:59.999Z") });

    expect(mockDb.ticket.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        contract: { status: "ACTIVE" },
        openedAt: { gte: new Date("2026-08-01T00:00:00.000Z") },
      },
      include: { contract: true },
      orderBy: { openedAt: "desc" },
    });
    expect(mockDb.ticket.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        contract: { status: "ACTIVE" },
        openedAt: { lte: new Date("2026-08-31T23:59:59.999Z") },
      },
      include: { contract: true },
      orderBy: { openedAt: "desc" },
    });
  });

  it("findActiveContract queries active contracts by id", async () => {
    mockDb.contract.findFirst.mockResolvedValue(null);

    const repository = new SlaRepository(mockDb as unknown as PrismaClient);
    await repository.findActiveContract("contract-1");

    expect(mockDb.contract.findFirst).toHaveBeenCalledWith({
      where: { id: "contract-1", status: "ACTIVE" },
    });
  });
});
