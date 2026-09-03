import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/contracts/route";
import { contractService } from "@/services/contract.service";
import { BadRequestError } from "@/lib/errors/app-error";

vi.mock("@/services/contract.service", () => ({
  contractService: {
    listContracts: vi.fn(),
    createContract: vi.fn(),
  },
}));

const sampleContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-2026-001",
  title: "Suporte mensal",
  description: null,
  value: "4500.00",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "ACTIVE",
  responseMinutes: 60,
  resolutionMinutes: 480,
};

describe("GET /api/contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns contracts without filters", async () => {
    vi.mocked(contractService.listContracts).mockResolvedValue([sampleContract]);

    const response = await GET(new Request("http://localhost/api/contracts"));
    const body = await response.json();

    expect(contractService.listContracts).toHaveBeenCalledWith({
      clientId: undefined,
      status: undefined,
    });
    expect(response.status).toBe(200);
    expect(body.contracts).toHaveLength(1);
  });

  it("returns contracts with optional filters", async () => {
    vi.mocked(contractService.listContracts).mockResolvedValue([sampleContract]);

    const response = await GET(
      new Request("http://localhost/api/contracts?clientId=client-1&status=ACTIVE"),
    );
    const body = await response.json();

    expect(contractService.listContracts).toHaveBeenCalledWith({
      clientId: "client-1",
      status: "ACTIVE",
    });
    expect(response.status).toBe(200);
    expect(body.contracts).toHaveLength(1);
  });

  it("returns 400 for invalid status filter", async () => {
    const response = await GET(
      new Request("http://localhost/api/contracts?status=INVALID"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("status filter is invalid");
  });
});

describe("POST /api/contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a contract and returns 201", async () => {
    vi.mocked(contractService.createContract).mockResolvedValue(sampleContract);

    const response = await POST(
      new Request("http://localhost/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client-1",
          code: "CTR-2026-001",
          title: "Suporte mensal",
          value: 4500,
          startDate: "2026-01-01",
          responseMinutes: 60,
          resolutionMinutes: 480,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.contract.code).toBe("CTR-2026-001");
  });

  it("returns validation errors from the service", async () => {
    vi.mocked(contractService.createContract).mockRejectedValue(
      new BadRequestError("clientId is required"),
    );

    const response = await POST(
      new Request("http://localhost/api/contracts", {
        method: "POST",
        body: JSON.stringify({ code: "CTR-001" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("clientId is required");
  });
});
