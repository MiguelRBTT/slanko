import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors/app-error";
import { SlaService } from "@/services/sla.service";
import type { SlaRepository } from "@/repositories/sla.repository";

const sampleContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-001",
  title: "Suporte mensal",
  description: null,
  value: { toString: () => "4500" },
  startDate: new Date("2026-01-01"),
  endDate: null,
  status: "ACTIVE" as const,
  responseMinutes: 60,
  resolutionMinutes: 480,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleTicket = {
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
  contract: sampleContract,
};

describe("SlaService", () => {
  const mockSla: SlaRepository = {
    findTickets: vi.fn(),
    findActiveContract: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds an SLA summary", async () => {
    vi.mocked(mockSla.findTickets).mockResolvedValue([sampleTicket]);

    const service = new SlaService(mockSla);
    const summary = await service.getSummary({ clientId: "client-1" });

    expect(summary.totalTickets).toBe(1);
    expect(summary.response.met).toBe(1);
    expect(summary.resolution.met).toBe(1);
    expect(summary.tickets[0].ticketId).toBe("ticket-1");
  });

  it("builds a contract SLA report", async () => {
    vi.mocked(mockSla.findActiveContract).mockResolvedValue(sampleContract);
    vi.mocked(mockSla.findTickets).mockResolvedValue([sampleTicket]);

    const service = new SlaService(mockSla);
    const report = await service.getContractReport("contract-1");

    expect(report.contractCode).toBe("CTR-001");
    expect(report.summary.totalTickets).toBe(1);
    expect(report.tickets).toHaveLength(1);
  });

  it("throws when contract is missing", async () => {
    vi.mocked(mockSla.findActiveContract).mockResolvedValue(null);

    const service = new SlaService(mockSla);
    await expect(service.getContractReport("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
