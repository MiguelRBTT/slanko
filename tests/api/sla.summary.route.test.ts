import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/sla/summary/route";
import { slaService } from "@/services/sla.service";

vi.mock("@/services/sla.service", () => ({
  slaService: {
    getSummary: vi.fn(),
  },
}));

const sampleSummary = {
  totalTickets: 1,
  response: { met: 1, breached: 0, pending: 0, complianceRate: 100 },
  resolution: { met: 1, breached: 0, pending: 0, complianceRate: 100 },
  tickets: [],
};

describe("GET /api/sla/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SLA summary with optional filters", async () => {
    vi.mocked(slaService.getSummary).mockResolvedValue(sampleSummary);

    const response = await GET(
      new Request(
        "http://localhost/api/sla/summary?clientId=client-1&contractId=contract-1&startDate=2026-08-01&endDate=2026-08-31",
      ),
    );
    const body = await response.json();

    expect(slaService.getSummary).toHaveBeenCalledWith({
      clientId: "client-1",
      contractId: "contract-1",
      openedFrom: new Date("2026-08-01T00:00:00.000Z"),
      openedTo: new Date("2026-08-31T23:59:59.999Z"),
    });
    expect(response.status).toBe(200);
    expect(body.summary.totalTickets).toBe(1);
  });

  it("returns validation errors for invalid periods", async () => {
    const response = await GET(
      new Request("http://localhost/api/sla/summary?startDate=2026/08/01"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("startDate");
  });

  it("returns 500 when summary generation fails unexpectedly", async () => {
    vi.mocked(slaService.getSummary).mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request("http://localhost/api/sla/summary"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
