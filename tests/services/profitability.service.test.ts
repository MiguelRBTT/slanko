import { beforeEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../helpers/fixtures";
import { NotFoundError } from "@/lib/errors/app-error";
import { ProfitabilityService } from "@/services/profitability.service";
import type { ProfitabilityRepository } from "@/repositories/profitability.repository";

const sampleUser = {
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

const sampleContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-001",
  title: "Suporte mensal",
  description: null,
  value: decimal("4500.00"),
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
      responseMinutes: 60,
      resolutionMinutes: 480,
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
          hours: decimal("2.00"),
          hourlyCost: decimal("85.50"),
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
  value: decimal("100.00"),
  tickets: [],
};

const today = new Date("2026-03-31T18:00:00.000Z");

describe("ProfitabilityService", () => {
  const mockRepository = {
    findContracts: vi.fn(),
  } as unknown as ProfitabilityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a profitability summary", async () => {
    vi.mocked(mockRepository.findContracts).mockResolvedValue([
      sampleContract,
      emptyContract,
    ]);

    const service = new ProfitabilityService(mockRepository, () => today);
    const summary = await service.getSummary({ clientId: "client-1" });

    expect(summary.totalContracts).toBe(2);
    expect(summary.contracts[0].totalCost).toBe("171.00");
    expect(summary.contracts[0].deficitary).toBe(false);
    expect(summary.contracts[1].totalHours).toBe("0.00");
  });

  it("compares cost with the revenue accrued since the contract started", async () => {
    vi.mocked(mockRepository.findContracts).mockResolvedValue([sampleContract]);

    const service = new ProfitabilityService(mockRepository, () => today);
    const summary = await service.getSummary();
    const [contract] = summary.contracts;

    // Janeiro a março inteiros: 3 × 4500.
    expect(contract.contractValue).toBe("4500.00");
    expect(contract.revenue).toBe("13500.00");
    expect(contract.periodStart).toBe("2026-01-01");
    expect(contract.periodEnd).toBe("2026-03-31");
    expect(contract.margin).toBe("13329.00");
    expect(summary.totalRevenue).toBe("13500.00");
  });

  it("uses only the revenue of the requested period", async () => {
    vi.mocked(mockRepository.findContracts).mockResolvedValue([emptyContract]);

    const service = new ProfitabilityService(mockRepository, () => today);
    const summary = await service.getSummary({
      workedFrom: new Date("2026-02-01T00:00:00.000Z"),
      workedTo: new Date("2026-02-28T23:59:59.999Z"),
    });

    expect(summary.contracts[0].revenue).toBe("100.00");
    expect(summary.contracts[0].periodStart).toBe("2026-02-01");
    expect(summary.contracts[0].periodEnd).toBe("2026-02-28");
  });

  it("uses the hourly cost stored on the entry, not the user's current cost", async () => {
    const raisedCost = {
      ...sampleContract,
      tickets: sampleContract.tickets.map((ticket) => ({
        ...ticket,
        timeEntries: ticket.timeEntries.map((entry) => ({
          ...entry,
          user: { ...entry.user, hourlyCost: decimal("200.00") },
        })),
      })),
    };
    vi.mocked(mockRepository.findContracts).mockResolvedValue([raisedCost]);

    const service = new ProfitabilityService(mockRepository, () => today);
    const report = await service.getContractReport("contract-1");

    expect(report.contract.totalCost).toBe("171.00");
    expect(report.entries[0].hourlyCost).toBe("85.50");
  });

  it("builds a contract profitability report with entry details", async () => {
    vi.mocked(mockRepository.findContracts).mockResolvedValue([sampleContract]);

    const service = new ProfitabilityService(mockRepository);
    const report = await service.getContractReport("contract-1");

    expect(report.contract.contractCode).toBe("CTR-001");
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].cost).toBe("171.00");
    expect(report.entries[0].userName).toBe("Carlos Tecnico");
  });

  it("throws when contract is missing", async () => {
    vi.mocked(mockRepository.findContracts).mockResolvedValue([]);

    const service = new ProfitabilityService(mockRepository);
    await expect(service.getContractReport("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
