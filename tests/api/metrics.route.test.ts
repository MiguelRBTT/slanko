import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/metrics/route";
import { metricsService } from "@/services/metrics.service";

vi.mock("@/services/metrics.service", () => ({
  metricsService: { refresh: vi.fn() },
}));

describe("GET /api/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes metrics and returns prometheus text exposition", async () => {
    vi.mocked(metricsService.refresh).mockResolvedValue(undefined);

    const response = await GET(new Request("http://localhost/api/metrics"));
    const body = await response.text();

    expect(metricsService.refresh).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(body).toContain("slanko_metrics_scrapes_total");
  });

  it("still answers the scrape when refreshing fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(metricsService.refresh).mockRejectedValue(new Error("db down"));

    const response = await GET(new Request("http://localhost/api/metrics"));

    expect(response.status).toBe(200);
  });

  it("requires the bearer token when METRICS_TOKEN is set", async () => {
    vi.stubEnv("METRICS_TOKEN", "segredo");
    vi.mocked(metricsService.refresh).mockResolvedValue(undefined);

    try {
      const denied = await GET(new Request("http://localhost/api/metrics"));
      const wrong = await GET(
        new Request("http://localhost/api/metrics", { headers: { authorization: "Bearer outro" } }),
      );
      const allowed = await GET(
        new Request("http://localhost/api/metrics", { headers: { authorization: "Bearer segredo" } }),
      );

      expect(denied.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(allowed.status).toBe(200);
      expect(metricsService.refresh).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
