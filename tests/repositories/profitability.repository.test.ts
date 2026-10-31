import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfitabilityRepository } from "@/repositories/profitability.repository";
import type { PrismaClient } from "@prisma/client";

describe("ProfitabilityRepository", () => {
  const mockDb = {
    contract: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findContracts works without optional filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ProfitabilityRepository(mockDb as unknown as PrismaClient);
    await repository.findContracts();

    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["ACTIVE"] } },
      include: {
        tickets: {
          include: {
            timeEntries: {
              where: {},
              include: { user: { select: { id: true, name: true } } },
              orderBy: { workedAt: "desc" },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
  });

  it("findContracts applies profitability filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ProfitabilityRepository(mockDb as unknown as PrismaClient);
    await repository.findContracts({
      contractId: "contract-1",
      clientId: "client-1",
      workedFrom: new Date("2026-08-01T00:00:00.000Z"),
      workedTo: new Date("2026-08-31T23:59:59.999Z"),
    });

    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["ACTIVE"] },
        id: "contract-1",
        clientId: "client-1",
      },
      include: {
        tickets: {
          include: {
            timeEntries: {
              where: {
                workedAt: {
                  gte: new Date("2026-08-01T00:00:00.000Z"),
                  lte: new Date("2026-08-31T23:59:59.999Z"),
                },
              },
              include: { user: { select: { id: true, name: true } } },
              orderBy: { workedAt: "desc" },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
  });

  it("findContracts supports partial workedAt filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ProfitabilityRepository(mockDb as unknown as PrismaClient);
    await repository.findContracts({ workedFrom: new Date("2026-08-01T00:00:00.000Z") });
    await repository.findContracts({ workedTo: new Date("2026-08-31T23:59:59.999Z") });

    expect(mockDb.contract.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        include: {
          tickets: {
            include: {
              timeEntries: {
                where: { workedAt: { gte: new Date("2026-08-01T00:00:00.000Z") } },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { workedAt: "desc" },
              },
            },
          },
        },
      }),
    );

    expect(mockDb.contract.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        include: {
          tickets: {
            include: {
              timeEntries: {
                where: { workedAt: { lte: new Date("2026-08-31T23:59:59.999Z") } },
                include: { user: { select: { id: true, name: true } } },
                orderBy: { workedAt: "desc" },
              },
            },
          },
        },
      }),
    );
  });
});
