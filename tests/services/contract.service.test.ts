import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { ContractService } from "@/services/contract.service";
import type { ClientRepository } from "@/repositories/client.repository";
import type { ContractRepository } from "@/repositories/contract.repository";

const sampleClient = {
  id: "client-1",
  name: "Tech Solutions Ltda",
  document: null,
  email: null,
  phone: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleContract = {
  id: "contract-1",
  clientId: "client-1",
  code: "CTR-2026-001",
  title: "Suporte mensal",
  description: null,
  value: { toString: () => "4500" },
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T00:00:00.000Z"),
  status: "ACTIVE" as const,
  responseMinutes: 60,
  resolutionMinutes: 480,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ContractService", () => {
  const mockContracts: ContractRepository = {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByCode: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countTickets: vi.fn(),
  };

  const mockClients: ClientRepository = {
    findMany: vi.fn(),
    findAllActive: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists and fetches contracts", async () => {
    vi.mocked(mockContracts.findMany).mockResolvedValue([sampleContract]);
    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);

    const service = new ContractService(mockContracts, mockClients);
    const contracts = await service.listContracts({ clientId: "client-1", status: "ACTIVE" });
    const contract = await service.getContractById("contract-1");

    expect(contracts).toHaveLength(1);
    expect(contract.code).toBe("CTR-2026-001");
  });

  it("throws when contract is missing", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(null);

    const service = new ContractService(mockContracts, mockClients);
    await expect(service.getContractById("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates a contract for an active client", async () => {
    vi.mocked(mockClients.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockContracts.create).mockResolvedValue(sampleContract);

    const service = new ContractService(mockContracts, mockClients);
    const contract = await service.createContract({
      clientId: "client-1",
      code: "CTR-2026-001",
      title: "Suporte mensal",
      value: "4500",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "ACTIVE",
      responseMinutes: 60,
      resolutionMinutes: 480,
    });

    expect(contract.code).toBe("CTR-2026-001");
  });

  it("defaults contract status to DRAFT", async () => {
    vi.mocked(mockClients.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockContracts.create).mockResolvedValue({ ...sampleContract, status: "DRAFT" });

    const service = new ContractService(mockContracts, mockClients);
    await service.createContract({
      clientId: "client-1",
      code: "CTR-2026-003",
      title: "Suporte",
      value: 1000,
      startDate: "2026-01-01",
      responseMinutes: 30,
      resolutionMinutes: 120,
    });

    expect(mockContracts.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DRAFT" }),
    );
  });

  it("rejects inactive clients on create", async () => {
    vi.mocked(mockClients.findById).mockResolvedValue({ ...sampleClient, active: false });

    const service = new ContractService(mockContracts, mockClients);
    await expect(
      service.createContract({
        clientId: "client-1",
        code: "CTR-001",
        title: "Suporte",
        value: 1000,
        startDate: "2026-01-01",
        responseMinutes: 30,
        resolutionMinutes: 120,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects invalid client, dates and duplicate codes on create", async () => {
    const service = new ContractService(mockContracts, mockClients);

    vi.mocked(mockClients.findById).mockResolvedValue(null);
    await expect(
      service.createContract({
        clientId: "missing",
        code: "CTR-001",
        title: "Suporte",
        value: 1000,
        startDate: "2026-12-31",
        endDate: "2026-01-01",
        responseMinutes: 30,
        resolutionMinutes: 120,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockClients.findById).mockResolvedValue(sampleClient);
    await expect(
      service.createContract({
        clientId: "client-1",
        code: "CTR-001",
        title: "Suporte",
        value: 1000,
        startDate: "2026-12-31",
        endDate: "2026-01-01",
        responseMinutes: 30,
        resolutionMinutes: 120,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockContracts.create).mockRejectedValue({ code: "P2002" });
    await expect(
      service.createContract({
        clientId: "client-1",
        code: "CTR-001",
        title: "Suporte",
        value: 1000,
        startDate: "2026-01-01",
        responseMinutes: 30,
        resolutionMinutes: 120,
        status: "INVALID",
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    await expect(
      service.createContract({
        clientId: "client-1",
        code: "CTR-001",
        title: "Suporte",
        value: 1000,
        startDate: "2026-01-01",
        responseMinutes: 30,
        resolutionMinutes: 120,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("re-throws unexpected create errors", async () => {
    vi.mocked(mockClients.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockContracts.create).mockRejectedValue(new Error("database unavailable"));

    const service = new ContractService(mockContracts, mockClients);
    await expect(
      service.createContract({
        clientId: "client-1",
        code: "CTR-001",
        title: "Suporte",
        value: 1000,
        startDate: "2026-01-01",
        responseMinutes: 30,
        resolutionMinutes: 120,
      }),
    ).rejects.toThrow("database unavailable");
  });

  it("updates a contract", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);
    vi.mocked(mockClients.findById).mockResolvedValue(sampleClient);
    vi.mocked(mockContracts.update).mockResolvedValue({ ...sampleContract, title: "Updated" });

    const service = new ContractService(mockContracts, mockClients);
    const contract = await service.updateContract("contract-1", {
      clientId: "client-1",
      code: "CTR-2026-002",
      title: "Updated",
      description: "Detalhes",
      value: 5000,
      startDate: "2026-02-01",
      endDate: null,
      status: "SUSPENDED",
      responseMinutes: 90,
      resolutionMinutes: 600,
    });

    expect(contract.title).toBe("Updated");
  });

  it("updates only provided contract fields", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);
    vi.mocked(mockContracts.update).mockResolvedValue({ ...sampleContract, title: "Only title" });

    const service = new ContractService(mockContracts, mockClients);
    await service.updateContract("contract-1", { title: "Only title" });

    expect(mockContracts.update).toHaveBeenCalledWith(
      "contract-1",
      expect.objectContaining({ title: "Only title" }),
    );
  });

  it("clears contract description on update", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);
    vi.mocked(mockContracts.update).mockResolvedValue({ ...sampleContract, description: null });

    const service = new ContractService(mockContracts, mockClients);
    await service.updateContract("contract-1", { description: null });

    expect(mockContracts.update).toHaveBeenCalledWith("contract-1", { description: null });
  });

  it("handles update errors", async () => {
    const service = new ContractService(mockContracts, mockClients);

    vi.mocked(mockContracts.findById).mockResolvedValue(null);
    await expect(service.updateContract("missing", { title: "Updated" })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);
    vi.mocked(mockClients.findById).mockResolvedValue({ ...sampleClient, active: false });
    await expect(
      service.updateContract("contract-1", { clientId: "client-2" }),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockClients.findById).mockResolvedValue(sampleClient);
    await expect(
      service.updateContract("contract-1", {
        startDate: "2026-12-31",
        endDate: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockContracts.update).mockRejectedValue({ code: "P2002" });
    await expect(service.updateContract("contract-1", { code: "CTR-999" })).rejects.toBeInstanceOf(
      ConflictError,
    );

    await expect(
      service.updateContract("contract-1", { status: "INVALID" as "ACTIVE" }),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockContracts.update).mockRejectedValue(new Error("database unavailable"));
    await expect(service.updateContract("contract-1", { title: "Updated" })).rejects.toThrow(
      "database unavailable",
    );
  });

  it("deletes a contract without tickets", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);
    vi.mocked(mockContracts.countTickets).mockResolvedValue(0);

    const service = new ContractService(mockContracts, mockClients);
    await service.deleteContract("contract-1");

    expect(mockContracts.delete).toHaveBeenCalledWith("contract-1");
  });

  it("blocks delete when tickets exist", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(sampleContract);
    vi.mocked(mockContracts.countTickets).mockResolvedValue(1);

    const service = new ContractService(mockContracts, mockClients);
    await expect(service.deleteContract("contract-1")).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws when deleting a missing contract", async () => {
    vi.mocked(mockContracts.findById).mockResolvedValue(null);

    const service = new ContractService(mockContracts, mockClients);
    await expect(service.deleteContract("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
