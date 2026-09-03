import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientRepository } from "@/repositories/client.repository";
import type { PrismaClient } from "@prisma/client";

describe("ClientRepository", () => {
  const mockDb = {
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findMany returns only active clients by default", async () => {
    mockDb.client.findMany.mockResolvedValue([]);

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.findMany();

    expect(mockDb.client.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  });

  it("findMany can include inactive clients", async () => {
    mockDb.client.findMany.mockResolvedValue([]);

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.findMany({ includeInactive: true });

    expect(mockDb.client.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { name: "asc" },
    });
  });

  it("findAllActive delegates to findMany", async () => {
    mockDb.client.findMany.mockResolvedValue([]);

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.findAllActive();

    expect(mockDb.client.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  });

  it("findById queries by primary key", async () => {
    mockDb.client.findUnique.mockResolvedValue(null);

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.findById("client-1");

    expect(mockDb.client.findUnique).toHaveBeenCalledWith({ where: { id: "client-1" } });
  });

  it("create inserts a client", async () => {
    mockDb.client.create.mockResolvedValue({ id: "client-1" });

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.create({ name: "Nova Empresa" });

    expect(mockDb.client.create).toHaveBeenCalledWith({ data: { name: "Nova Empresa" } });
  });

  it("update modifies a client", async () => {
    mockDb.client.update.mockResolvedValue({ id: "client-1" });

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.update("client-1", { active: false });

    expect(mockDb.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { active: false },
    });
  });
});
