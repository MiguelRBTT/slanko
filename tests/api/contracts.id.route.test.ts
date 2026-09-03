import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PUT } from "@/app/api/contracts/[id]/route";
import { contractService } from "@/services/contract.service";
import { ConflictError, NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/contract.service", () => ({
  contractService: {
    getContractById: vi.fn(),
    updateContract: vi.fn(),
    deleteContract: vi.fn(),
  },
}));

const routeContext = { params: Promise.resolve({ id: "contract-1" }) };

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

describe("GET /api/contracts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a contract by id", async () => {
    vi.mocked(contractService.getContractById).mockResolvedValue(sampleContract);

    const response = await GET(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contract.id).toBe("contract-1");
  });

  it("returns 404 when contract is not found", async () => {
    vi.mocked(contractService.getContractById).mockRejectedValue(
      new NotFoundError("Contract not found"),
    );

    const response = await GET(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Contract not found");
  });
});

describe("PUT /api/contracts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a contract", async () => {
    vi.mocked(contractService.updateContract).mockResolvedValue({
      ...sampleContract,
      title: "Updated",
    });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
      }),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.contract.title).toBe("Updated");
  });

  it("returns 404 when updating a missing contract", async () => {
    vi.mocked(contractService.updateContract).mockRejectedValue(
      new NotFoundError("Contract not found"),
    );

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
      }),
      routeContext,
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/contracts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a contract", async () => {
    vi.mocked(contractService.deleteContract).mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 409 when contract has tickets", async () => {
    vi.mocked(contractService.deleteContract).mockRejectedValue(
      new ConflictError("Contract cannot be deleted while tickets exist"),
    );

    const response = await DELETE(new Request("http://localhost"), routeContext);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Contract cannot be deleted while tickets exist");
  });
});
