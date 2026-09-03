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

  it("findActiveContracts works without optional filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ProfitabilityRepository(mockDb as unknown as PrismaClient);
    await repository.findActiveContracts();

    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      include: {
        tickets: {
          include: {
            timeEntries: {
              where: {},
              include: { user: true },
              orderBy: { workedAt: "desc" },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
  });

  it("findActiveContracts applies profitability filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ProfitabilityRepository(mockDb as unknown as PrismaClient);
    await repository.findActiveContracts({
      contractId: "contract-1",
      clientId: "client-1",
      workedFrom: new Date("2026-08-01T00:00:00.000Z"),
      workedTo: new Date("2026-08-31T23:59:59.999Z"),
    });

    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
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
              include: { user: true },
              orderBy: { workedAt: "desc" },
            },
          },
        },
      },
      orderBy: { code: "asc" },
    });
  });

  it("findActiveContracts supports partial workedAt filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ProfitabilityRepository(mockDb as unknown as PrismaClient);
    await repository.findActiveContracts({ workedFrom: new Date("2026-08-01T00:00:00.000Z") });
    await repository.findActiveContracts({ workedTo: new Date("2026-08-31T23:59:59.999Z") });

    expect(mockDb.contract.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        include: {
          tickets: {
            include: {
              timeEntries: {
                where: { workedAt: { gte: new Date("2026-08-01T00:00:00.000Z") } },
                include: { user: true },
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
                include: { user: true },
                orderBy: { workedAt: "desc" },
              },
            },
          },
        },
      }),
    );
  });
});
