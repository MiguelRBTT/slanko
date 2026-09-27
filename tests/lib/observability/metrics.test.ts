import { beforeEach, describe, expect, it } from "vitest";
import {
  prometheusContentType,
  recordHealthCheck,
  recordMetricsScrape,
  renderPrometheusMetrics,
} from "@/lib/observability/metrics";

describe("observability metrics", () => {
  beforeEach(() => {
    recordHealthCheck({ status: "ok", database: "up" });
  });

  it("exposes prometheus content type", () => {
    expect(prometheusContentType()).toContain("text/plain");
  });

  it("renders health and scrape metrics", async () => {
    recordMetricsScrape();
    recordHealthCheck({ status: "degraded", database: "down" });

    const body = await renderPrometheusMetrics();

    expect(body).toContain("slanko_health_status");
    expect(body).toContain("slanko_database_up");
    expect(body).toContain("slanko_health_checks_total");
    expect(body).toContain("slanko_metrics_scrapes_total");
    expect(body).toContain("slanko_process_");
  });
});
