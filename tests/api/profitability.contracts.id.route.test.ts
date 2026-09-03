import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/profitability/contracts/[id]/route";
import { profitabilityService } from "@/services/profitability.service";
import { NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/profitability.service", () => ({
  profitabilityService: {
    getContractReport: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "contract-1" }) };

const sampleReport = {
  contract: {
    contractId: "contract-1",
    contractCode: "CTR-001",
    contractTitle: "Suporte mensal",
    clientId: "client-1",
    contractValue: "4500.00",
    totalHours: "2.00",
    totalCost: "171.00",
    margin: "4329.00",
    marginRate: 96.2,
    deficitary: false,
  },
  entries: [],
};

describe("GET /api/profitability/contracts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profitability report for a contract", async () => {
    vi.mocked(profitabilityService.getContractReport).mockResolvedValue(sampleReport);

    const response = await GET(
      new Request("http://localhost/api/profitability/contracts/contract-1?startDate=2026-08-01"),
      routeContext,
    );
    const body = await response.json();

    expect(profitabilityService.getContractReport).toHaveBeenCalledWith("contract-1", {
      workedFrom: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(response.status).toBe(200);
    expect(body.report.contract.contractCode).toBe("CTR-001");
  });

  it("returns 404 when contract is not found", async () => {
    vi.mocked(profitabilityService.getContractReport).mockRejectedValue(
      new NotFoundError("Contract not found"),
    );

    const response = await GET(new Request("http://localhost"), routeContext);

    expect(response.status).toBe(404);
  });
});
