import { beforeEach, describe, expect, it, vi } from "vitest";
import { decimal } from "../helpers/fixtures";
import { NotFoundError } from "@/lib/errors/app-error";
import { SlaService } from "@/services/sla.service";
import type { SlaRepository } from "@/repositories/sla.repository";

const sampleContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-001",
  title: "Suporte mensal",
  description: null,
  value: decimal("4500"),
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
  responseMinutes: 60,
  resolutionMinutes: 480,
  firstResponseAt: new Date("2026-08-19T10:30:00.000Z"),
  resolvedAt: new Date("2026-08-19T14:00:00.000Z"),
  closedAt: null,
  solution: "Reiniciado",
  createdAt: new Date(),
  updatedAt: new Date(),
  contract: sampleContract,
};

describe("SlaService", () => {
  const mockSla = {
    findTickets: vi.fn(),
    findReportableContract: vi.fn(),
  } as unknown as SlaRepository;

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
    vi.mocked(mockSla.findReportableContract).mockResolvedValue(sampleContract);
    vi.mocked(mockSla.findTickets).mockResolvedValue([sampleTicket]);

    const service = new SlaService(mockSla);
    const report = await service.getContractReport("contract-1");

    expect(report.contractCode).toBe("CTR-001");
    expect(report.summary.totalTickets).toBe(1);
    expect(report.tickets).toHaveLength(1);
  });

  it("counts an overdue ticket without response or resolution as breached", async () => {
    vi.mocked(mockSla.findTickets).mockResolvedValue([
      {
        ...sampleTicket,
        status: "OPEN" as const,
        firstResponseAt: null,
        resolvedAt: null,
        solution: null,
      },
    ]);

    // 10h depois da abertura: resposta (60 min) e resolução (480 min) já estouraram.
    const service = new SlaService(mockSla, () => new Date("2026-08-19T20:00:00.000Z"));
    const summary = await service.getSummary();

    expect(summary.response.breached).toBe(1);
    expect(summary.response.pending).toBe(0);
    expect(summary.resolution.breached).toBe(1);
    expect(summary.response.complianceRate).toBe(0);
    expect(summary.tickets[0].response.elapsedMinutes).toBe(600);
  });

  it("keeps a ticket still within the deadline as pending", async () => {
    vi.mocked(mockSla.findTickets).mockResolvedValue([
      { ...sampleTicket, status: "OPEN" as const, firstResponseAt: null, resolvedAt: null },
    ]);

    const service = new SlaService(mockSla, () => new Date("2026-08-19T10:20:00.000Z"));
    const summary = await service.getSummary();

    expect(summary.response.pending).toBe(1);
    expect(summary.response.complianceRate).toBeNull();
  });

  it("uses closedAt as resolution when a ticket was closed without being resolved", async () => {
    vi.mocked(mockSla.findTickets).mockResolvedValue([
      {
        ...sampleTicket,
        status: "CLOSED" as const,
        resolvedAt: null,
        closedAt: new Date("2026-08-19T12:00:00.000Z"),
      },
    ]);

    const service = new SlaService(mockSla, () => new Date("2026-09-01T00:00:00.000Z"));
    const summary = await service.getSummary();

    expect(summary.resolution.met).toBe(1);
    expect(summary.tickets[0].resolution.elapsedMinutes).toBe(120);
  });

  it("throws when contract is missing", async () => {
    vi.mocked(mockSla.findReportableContract).mockResolvedValue(null);

    const service = new SlaService(mockSla);
    await expect(service.getContractReport("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("uses the SLA targets frozen on the ticket, not the current contract targets", async () => {
    vi.mocked(mockSla.findTickets).mockResolvedValue([
      {
        ...sampleTicket,
        // Meta do contrato foi apertada para 10 min depois da abertura deste chamado.
        contract: { ...sampleContract, responseMinutes: 10 },
      },
    ]);

    const service = new SlaService(mockSla);
    const summary = await service.getSummary();

    expect(summary.tickets[0].response.targetMinutes).toBe(60);
    expect(summary.response.met).toBe(1);
  });

  it("groups tickets by contract and flags contracts with critical SLA", async () => {
    const breached = {
      ...sampleTicket,
      firstResponseAt: new Date("2026-08-19T12:00:00.000Z"),
      resolvedAt: new Date("2026-08-21T10:00:00.000Z"),
    };
    const otherContract = { ...sampleContract, id: "contract-2", code: "CTR-002" };
    vi.mocked(mockSla.findTickets).mockResolvedValue([
      { ...breached, id: "t1" },
      { ...breached, id: "t2" },
      { ...breached, id: "t3" },
      { ...sampleTicket, id: "t4", contractId: "contract-2", contract: otherContract },
    ]);

    const service = new SlaService(mockSla);
    const summary = await service.getSummary();

    const critical = summary.contracts.find((contract) => contract.contractId === "contract-1");
    const healthy = summary.contracts.find((contract) => contract.contractId === "contract-2");

    expect(critical).toMatchObject({
      totalTickets: 3,
      breachedTickets: 3,
      responseComplianceRate: 0,
      alert: true,
      alertReasons: ["LOW_RESPONSE_COMPLIANCE", "LOW_RESOLUTION_COMPLIANCE", "RECURRING_BREACHES"],
    });
    expect(healthy).toMatchObject({ contractCode: "CTR-002", alert: false, alertReasons: [] });
  });
});
