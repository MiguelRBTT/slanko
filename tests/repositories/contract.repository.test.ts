import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContractRepository } from "@/repositories/contract.repository";
import type { PrismaClient } from "@prisma/client";

describe("ContractRepository", () => {
  const mockDb = {
    contract: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ticket: {
      count: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findMany applies optional filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ContractRepository(mockDb as unknown as PrismaClient);
    await repository.findMany({ clientId: "client-1", status: "ACTIVE" });

    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: { clientId: "client-1", status: "ACTIVE" },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });
  });

  it("findMany works without filters", async () => {
    mockDb.contract.findMany.mockResolvedValue([]);

    const repository = new ContractRepository(mockDb as unknown as PrismaClient);
    await repository.findMany();

    expect(mockDb.contract.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
    });
  });

  it("findById and findByCode query unique fields", async () => {
    mockDb.contract.findUnique.mockResolvedValue(null);

    const repository = new ContractRepository(mockDb as unknown as PrismaClient);
    await repository.findById("contract-1");
    await repository.findByCode("CTR-001");

    expect(mockDb.contract.findUnique).toHaveBeenNthCalledWith(1, { where: { id: "contract-1" } });
    expect(mockDb.contract.findUnique).toHaveBeenNthCalledWith(2, { where: { code: "CTR-001" } });
  });

  it("create, update and delete contracts", async () => {
    mockDb.contract.create.mockResolvedValue({ id: "contract-1" });
    mockDb.contract.update.mockResolvedValue({ id: "contract-1" });
    mockDb.contract.delete.mockResolvedValue({ id: "contract-1" });

    const repository = new ContractRepository(mockDb as unknown as PrismaClient);
    await repository.create({ code: "CTR-001" });
    await repository.update("contract-1", { title: "Updated" });
    await repository.delete("contract-1");

    expect(mockDb.contract.create).toHaveBeenCalled();
    expect(mockDb.contract.update).toHaveBeenCalled();
    expect(mockDb.contract.delete).toHaveBeenCalledWith({ where: { id: "contract-1" } });
  });

  it("countTickets returns ticket total for a contract", async () => {
    mockDb.ticket.count.mockResolvedValue(2);

    const repository = new ContractRepository(mockDb as unknown as PrismaClient);
    const total = await repository.countTickets("contract-1");

    expect(total).toBe(2);
    expect(mockDb.ticket.count).toHaveBeenCalledWith({ where: { contractId: "contract-1" } });
  });
});
