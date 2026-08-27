import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRepository } from "@/repositories/user.repository";
import type { PrismaClient } from "@prisma/client";

// Unit tests for UserRepository Prisma queries.

describe("UserRepository", () => {
  const mockDb = {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findAllActive queries only active users ordered by name", async () => {
    mockDb.user.findMany.mockResolvedValue([]);

    const repository = new UserRepository(mockDb as unknown as PrismaClient);
    await repository.findAllActive();

    expect(mockDb.user.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  });

  it("findByEmail queries by unique email", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);

    const repository = new UserRepository(mockDb as unknown as PrismaClient);
    await repository.findByEmail("gestor@slanko.local");

    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { email: "gestor@slanko.local" },
    });
  });
});
