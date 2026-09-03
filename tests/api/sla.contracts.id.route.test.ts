import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/sla/contracts/[id]/route";
import { slaService } from "@/services/sla.service";
import { NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/sla.service", () => ({
  slaService: {
    getContractReport: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "contract-1" }) };

const sampleReport = {
  contractId: "contract-1",
  contractCode: "CTR-001",
  contractTitle: "Suporte mensal",
  clientId: "client-1",
  responseMinutes: 60,
  resolutionMinutes: 480,
  summary: {
    totalTickets: 1,
    response: { met: 1, breached: 0, pending: 0, complianceRate: 100 },
    resolution: { met: 1, breached: 0, pending: 0, complianceRate: 100 },
  },
  tickets: [],
};

describe("GET /api/sla/contracts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SLA report for a contract", async () => {
    vi.mocked(slaService.getContractReport).mockResolvedValue(sampleReport);

    const response = await GET(
      new Request("http://localhost/api/sla/contracts/contract-1?startDate=2026-08-01"),
      routeContext,
    );
    const body = await response.json();

    expect(slaService.getContractReport).toHaveBeenCalledWith("contract-1", {
      openedFrom: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(response.status).toBe(200);
    expect(body.report.contractCode).toBe("CTR-001");
  });

  it("returns 404 when contract is not found", async () => {
    vi.mocked(slaService.getContractReport).mockRejectedValue(new NotFoundError("Contract not found"));

    const response = await GET(new Request("http://localhost"), routeContext);

    expect(response.status).toBe(404);
  });
});
