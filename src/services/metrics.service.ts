import { recordBusinessMetrics, type BusinessMetricsSnapshot } from "@/lib/observability/metrics";
import { toNumeric } from "@/lib/profitability/calculations";
import { TicketRepository, ticketRepository } from "@/repositories/ticket.repository";
import { HealthService, healthService } from "@/services/health.service";
import { ProfitabilityService, profitabilityService } from "@/services/profitability.service";
import { SlaService, slaService } from "@/services/sla.service";

// Atualiza saúde e métricas de negócio a cada coleta do Prometheus (RNF07).
// Antes, os gauges de saúde só mudavam quando alguém chamava /api/health.

export class MetricsService {
  constructor(
    private readonly health: HealthService = healthService,
    private readonly sla: SlaService = slaService,
    private readonly profitability: ProfitabilityService = profitabilityService,
    private readonly tickets: TicketRepository = ticketRepository,
  ) {}

  async refresh(): Promise<void> {
    const status = await this.health.check();

    // Sem banco não há métricas de negócio; os gauges de saúde já indicam o problema.
    if (status.database === "down") {
      return;
    }

    const [ticketsByStatus, sla, profitability] = await Promise.all([
      this.tickets.countByStatus(),
      this.sla.getSummary(),
      this.profitability.getSummary(),
    ]);

    const snapshot: BusinessMetricsSnapshot = {
      ticketsByStatus,
      slaBreached: { response: sla.response.breached, resolution: sla.resolution.breached },
      slaCriticalContracts: sla.contracts.filter((contract) => contract.alert).length,
      activeContracts: profitability.totalContracts,
      deficitaryContracts: profitability.deficitaryContracts,
      marginTotal: toNumeric(profitability.totalMargin),
    };

    recordBusinessMetrics(snapshot);
  }
}

export const metricsService = new MetricsService();
