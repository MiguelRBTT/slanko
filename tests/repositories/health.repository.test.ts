import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthRepository } from "@/repositories/health.repository";
import type { PrismaClient } from "@prisma/client";

// Unit tests for HealthRepository database ping.

describe("HealthRepository", () => {
  const mockDb = {
    $queryRaw: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when SELECT 1 succeeds", async () => {
    mockDb.$queryRaw.mockResolvedValue([{ "1": 1 }]);

    const repository = new HealthRepository(mockDb as unknown as PrismaClient);
    const result = await repository.pingDatabase();

    expect(result).toBe(true);
  });

  it("returns false when SELECT 1 throws", async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error("connection refused"));

    const repository = new HealthRepository(mockDb as unknown as PrismaClient);
    const result = await repository.pingDatabase();

    expect(result).toBe(false);
  });
});
