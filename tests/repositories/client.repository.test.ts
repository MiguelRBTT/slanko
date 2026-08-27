import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientRepository } from "@/repositories/client.repository";
import type { PrismaClient } from "@prisma/client";

// Unit tests for ClientRepository Prisma queries.

describe("ClientRepository", () => {
  const mockDb = {
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findAllActive queries only active clients ordered by name", async () => {
    mockDb.client.findMany.mockResolvedValue([]);

    const repository = new ClientRepository(mockDb as unknown as PrismaClient);
    await repository.findAllActive();

    expect(mockDb.client.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  });
});
