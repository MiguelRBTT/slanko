import client from "prom-client";

type MetricsState = {
  register: client.Registry;
  healthChecksTotal: client.Counter<string>;
  metricsScrapesTotal: client.Counter<string>;
  healthStatus: client.Gauge<string>;
  databaseUp: client.Gauge<string>;
  apiErrorsTotal: client.Counter<string>;
  loginAttemptsTotal: client.Counter<string>;
  ticketsByStatus: client.Gauge<string>;
  slaBreachedTickets: client.Gauge<string>;
  slaCriticalContracts: client.Gauge<string>;
  contractsTotal: client.Gauge<string>;
  deficitaryContracts: client.Gauge<string>;
  marginTotal: client.Gauge<string>;
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

  const apiErrorsTotal = new client.Counter({
    name: "slanko_api_errors_total",
    help: "Respostas de erro da API por código HTTP",
    labelNames: ["status_code"] as const,
    registers: [register],
  });

  const loginAttemptsTotal = new client.Counter({
    name: "slanko_login_attempts_total",
    help: "Tentativas de login por resultado (success, failure, blocked)",
    labelNames: ["result"] as const,
    registers: [register],
  });

  // Métricas de negócio, recalculadas a cada coleta do Prometheus.
  const ticketsByStatus = new client.Gauge({
    name: "slanko_tickets",
    help: "Chamados por situação",
    labelNames: ["status"] as const,
    registers: [register],
  });

  const slaBreachedTickets = new client.Gauge({
    name: "slanko_sla_breached_tickets",
    help: "Chamados de contratos ativos com SLA violado, por meta (response, resolution)",
    labelNames: ["metric"] as const,
    registers: [register],
  });

  const slaCriticalContracts = new client.Gauge({
    name: "slanko_sla_critical_contracts",
    help: "Contratos ativos em alerta de SLA (conformidade < 80% ou 3+ violações)",
    registers: [register],
  });

  const contractsTotal = new client.Gauge({
    name: "slanko_active_contracts",
    help: "Contratos ativos",
    registers: [register],
  });

  const deficitaryContracts = new client.Gauge({
    name: "slanko_deficitary_contracts",
    help: "Contratos ativos com margem negativa",
    registers: [register],
  });

  const marginTotal = new client.Gauge({
    name: "slanko_contracts_margin_brl",
    help: "Margem acumulada dos contratos ativos (R$)",
    registers: [register],
  });

  return {
    register,
    healthChecksTotal,
    metricsScrapesTotal,
    healthStatus,
    databaseUp,
    apiErrorsTotal,
    loginAttemptsTotal,
    ticketsByStatus,
    slaBreachedTickets,
    slaCriticalContracts,
    contractsTotal,
    deficitaryContracts,
    marginTotal,
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

export function recordApiError(statusCode: number): void {
  metrics.apiErrorsTotal.inc({ status_code: String(statusCode) });
}

export function recordLoginAttempt(result: "success" | "failure" | "blocked"): void {
  metrics.loginAttemptsTotal.inc({ result });
}

export type BusinessMetricsSnapshot = {
  ticketsByStatus: Record<string, number>;
  slaBreached: { response: number; resolution: number };
  slaCriticalContracts: number;
  activeContracts: number;
  deficitaryContracts: number;
  marginTotal: number;
};

export function recordBusinessMetrics(snapshot: BusinessMetricsSnapshot): void {
  metrics.ticketsByStatus.reset();
  for (const [status, count] of Object.entries(snapshot.ticketsByStatus)) {
    metrics.ticketsByStatus.set({ status }, count);
  }

  metrics.slaBreachedTickets.set({ metric: "response" }, snapshot.slaBreached.response);
  metrics.slaBreachedTickets.set({ metric: "resolution" }, snapshot.slaBreached.resolution);
  metrics.slaCriticalContracts.set(snapshot.slaCriticalContracts);
  metrics.contractsTotal.set(snapshot.activeContracts);
  metrics.deficitaryContracts.set(snapshot.deficitaryContracts);
  metrics.marginTotal.set(snapshot.marginTotal);
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
