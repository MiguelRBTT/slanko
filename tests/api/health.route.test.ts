import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { healthService } from "@/services/health.service";

// API route tests for GET /api/health with mocked service layer.

vi.mock("@/services/health.service", () => ({
  healthService: {
    check: vi.fn(),
  },
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when health status is ok", async () => {
    vi.mocked(healthService.check).mockResolvedValue({
      status: "ok",
      app: "up",
      database: "up",
      timestamp: "2026-08-26T00:00:00.000Z",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("returns 503 when health status is degraded", async () => {
    vi.mocked(healthService.check).mockResolvedValue({
      status: "degraded",
      app: "up",
      database: "down",
      timestamp: "2026-08-26T00:00:00.000Z",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.database).toBe("down");
  });
});
