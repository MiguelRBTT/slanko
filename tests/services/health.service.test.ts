import { beforeEach, describe, expect, it, vi } from "vitest";
import { HealthService } from "@/services/health.service";
import type { HealthRepository } from "@/repositories/health.repository";

// Unit tests for HealthService with a mocked repository.

describe("HealthService", () => {
  const mockRepository: HealthRepository = {
    pingDatabase: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when the database responds", async () => {
    vi.mocked(mockRepository.pingDatabase).mockResolvedValue(true);

    const service = new HealthService(mockRepository);
    const result = await service.check();

    expect(result.status).toBe("ok");
    expect(result.app).toBe("up");
    expect(result.database).toBe("up");
    expect(result.timestamp).toBeTruthy();
  });

  it("returns degraded when the database is unreachable", async () => {
    vi.mocked(mockRepository.pingDatabase).mockResolvedValue(false);

    const service = new HealthService(mockRepository);
    const result = await service.check();

    expect(result.status).toBe("degraded");
    expect(result.database).toBe("down");
  });
});
