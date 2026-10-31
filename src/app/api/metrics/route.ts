import { NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/auth/jwt";
import { prometheusContentType, recordMetricsScrape, renderPrometheusMetrics } from "@/lib/observability/metrics";
import { metricsService } from "@/services/metrics.service";

// GET /api/metrics - Prometheus scrape endpoint.
// Expõe indicadores de negócio (margem, contratos deficitários), então exige
// "Authorization: Bearer <METRICS_TOKEN>" quando METRICS_TOKEN está definido.

function isAuthorized(request: Request): boolean {
  const expected = process.env.METRICS_TOKEN;

  if (!expected) {
    return true;
  }

  return extractBearerToken(request.headers.get("authorization")) === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  recordMetricsScrape();

  try {
    await metricsService.refresh();
  } catch (error) {
    // A coleta nunca falha por causa do banco: o gauge slanko_database_up já mostra o problema.
    console.error(error);
  }

  const body = await renderPrometheusMetrics();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": prometheusContentType(),
      "Cache-Control": "no-store",
    },
  });
}
