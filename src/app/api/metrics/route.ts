import { prometheusContentType, recordMetricsScrape, renderPrometheusMetrics } from "@/lib/observability/metrics";

// GET /api/metrics - Prometheus scrape endpoint (public; local/docker network).

export async function GET() {
  recordMetricsScrape();
  const body = await renderPrometheusMetrics();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": prometheusContentType(),
      "Cache-Control": "no-store",
    },
  });
}
