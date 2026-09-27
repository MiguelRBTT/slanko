import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/metrics/route";

describe("GET /api/metrics", () => {
  it("returns prometheus text exposition", async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(body).toContain("slanko_metrics_scrapes_total");
  });
});
