import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors/app-error";
import { ProfitabilityService } from "@/services/profitability.service";
import type { ProfitabilityRepository } from "@/repositories/profitability.repository";

const sampleUser = {
  id: "user-tecnico",
  name: "Carlos Tecnico",
  email: "tecnico@slanko.local",
  passwordHash: "hash",
  role: "TECNICO" as const,
  hourlyCost: { toString: () => "85.50" },
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-001",
  title: "Suporte mensal",
  description: null,
  value: { toString: () => "4500.00" },
  startDate: new Date("2026-01-01"),
  endDate: null,
  status: "ACTIVE" as const,
  responseMinutes: 60,
  resolutionMinutes: 480,
  createdAt: new Date(),
  updatedAt: new Date(),
  tickets: [
    {
      id: "ticket-1",
      contractId: "contract-1",
      openedById: "user-gestor",
      assignedToId: "user-tecnico",
      title: "Servidor lento",
      description: "Detalhes",
      priority: "HIGH" as const,
      category: "Infraestrutura",
      status: "RESOLVED" as const,
      openedAt: new Date("2026-08-19T10:00:00.000Z"),
      firstResponseAt: new Date("2026-08-19T10:30:00.000Z"),
      resolvedAt: new Date("2026-08-19T14:00:00.000Z"),
      closedAt: null,
      solution: "Reiniciado",
      createdAt: new Date(),
      updatedAt: new Date(),
      timeEntries: [
        {
          id: "entry-1",
          ticketId: "ticket-1",
          userId: "user-tecnico",
          hours: { toString: () => "2.00" },
          note: "Diagnostico",
          workedAt: new Date("2026-08-19T14:00:00.000Z"),
          createdAt: new Date(),
          updatedAt: new Date(),
          user: sampleUser,
        },
      ],
    },
  ],
};

const emptyContract = {
  ...sampleContract,
  id: "contract-2",
  code: "CTR-002",
  value: { toString: () => "100.00" },
  tickets: [],
};

describe("ProfitabilityService", () => {
  const mockRepository: ProfitabilityRepository = {
    findActiveContracts: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a profitability summary", async () => {
    vi.mocked(mockRepository.findActiveContracts).mockResolvedValue([
      sampleContract,
      emptyContract,
    ]);

    const service = new ProfitabilityService(mockRepository);
    const summary = await service.getSummary({ clientId: "client-1" });

    expect(summary.totalContracts).toBe(2);
    expect(summary.contracts[0].totalCost).toBe("171.00");
    expect(summary.contracts[0].deficitary).toBe(false);
    expect(summary.contracts[1].totalHours).toBe("0.00");
  });

  it("builds a contract profitability report with entry details", async () => {
    vi.mocked(mockRepository.findActiveContracts).mockResolvedValue([sampleContract]);

    const service = new ProfitabilityService(mockRepository);
    const report = await service.getContractReport("contract-1");

    expect(report.contract.contractCode).toBe("CTR-001");
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].cost).toBe("171.00");
    expect(report.entries[0].userName).toBe("Carlos Tecnico");
  });

  it("throws when contract is missing", async () => {
    vi.mocked(mockRepository.findActiveContracts).mockResolvedValue([]);

    const service = new ProfitabilityService(mockRepository);
    await expect(service.getContractReport("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
