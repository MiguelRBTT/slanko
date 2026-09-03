import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/profitability/summary/route";
import { profitabilityService } from "@/services/profitability.service";

vi.mock("@/services/profitability.service", () => ({
  profitabilityService: {
    getSummary: vi.fn(),
  },
}));

const sampleSummary = {
  totalContracts: 1,
  deficitaryContracts: 0,
  totalContractValue: "4500.00",
  totalHours: "2.00",
  totalCost: "171.00",
  totalMargin: "4329.00",
  contracts: [],
};

describe("GET /api/profitability/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profitability summary with optional filters", async () => {
    vi.mocked(profitabilityService.getSummary).mockResolvedValue(sampleSummary);

    const response = await GET(
      new Request(
        "http://localhost/api/profitability/summary?clientId=client-1&contractId=contract-1&startDate=2026-08-01&endDate=2026-08-31",
      ),
    );
    const body = await response.json();

    expect(profitabilityService.getSummary).toHaveBeenCalledWith({
      clientId: "client-1",
      contractId: "contract-1",
      workedFrom: new Date("2026-08-01T00:00:00.000Z"),
      workedTo: new Date("2026-08-31T23:59:59.999Z"),
    });
    expect(response.status).toBe(200);
    expect(body.summary.totalContracts).toBe(1);
  });

  it("returns validation errors for invalid periods", async () => {
    const response = await GET(
      new Request("http://localhost/api/profitability/summary?startDate=2026/08/01"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("startDate");
  });

  it("returns 500 when summary generation fails unexpectedly", async () => {
    vi.mocked(profitabilityService.getSummary).mockRejectedValue(
      new Error("database unavailable"),
    );

    const response = await GET(new Request("http://localhost/api/profitability/summary"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
