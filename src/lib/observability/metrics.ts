import client from "prom-client";

type MetricsState = {
  register: client.Registry;
  healthChecksTotal: client.Counter<string>;
  metricsScrapesTotal: client.Counter<string>;
  healthStatus: client.Gauge<string>;
  databaseUp: client.Gauge<string>;
};

const globalForMetrics = globalThis as typeof globalThis & {
  __slankoMetrics?: MetricsState;
};

function createMetrics(): MetricsState {
  const register = new client.Registry();
  register.setDefaultLabels({ app: "slanko" });
  client.collectDefaultMetrics({ register, prefix: "slanko_" });

  const healthChecksTotal = new client.Counter({
    name: "slanko_health_checks_total",
    help: "Total de checagens em /api/health",
    labelNames: ["status"] as const,
    registers: [register],
  });

  const metricsScrapesTotal = new client.Counter({
    name: "slanko_metrics_scrapes_total",
    help: "Total de scrapes em /api/metrics",
    registers: [register],
  });

  const healthStatus = new client.Gauge({
    name: "slanko_health_status",
    help: "Status agregado de saúde (1=ok, 0=degraded)",
    registers: [register],
  });

  const databaseUp = new client.Gauge({
    name: "slanko_database_up",
    help: "Disponibilidade do MySQL (1=up, 0=down)",
    registers: [register],
  });

  return {
    register,
    healthChecksTotal,
    metricsScrapesTotal,
    healthStatus,
    databaseUp,
  };
}

export const metrics: MetricsState = globalForMetrics.__slankoMetrics ?? createMetrics();

if (process.env.NODE_ENV !== "production") {
  globalForMetrics.__slankoMetrics = metrics;
}

export function recordHealthCheck(input: {
  status: "ok" | "degraded";
  database: "up" | "down";
}): void {
  metrics.healthStatus.set(input.status === "ok" ? 1 : 0);
  metrics.databaseUp.set(input.database === "up" ? 1 : 0);
  metrics.healthChecksTotal.inc({ status: input.status });
}

export function recordMetricsScrape(): void {
  metrics.metricsScrapesTotal.inc();
}

export async function renderPrometheusMetrics(): Promise<string> {
  return metrics.register.metrics();
}

export function prometheusContentType(): string {
  return metrics.register.contentType;
}
