import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsService } from "@/services/metrics.service";
import { renderPrometheusMetrics } from "@/lib/observability/metrics";
import type { HealthService } from "@/services/health.service";
import type { SlaService } from "@/services/sla.service";
import type { ProfitabilityService } from "@/services/profitability.service";
import type { TicketRepository } from "@/repositories/ticket.repository";

describe("MetricsService", () => {
  const health = { check: vi.fn() } as unknown as HealthService;
  const sla = { getSummary: vi.fn() } as unknown as SlaService;
  const profitability = { getSummary: vi.fn() } as unknown as ProfitabilityService;
  const tickets = { countByStatus: vi.fn() } as unknown as TicketRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes business metrics on each scrape", async () => {
    vi.mocked(health.check).mockResolvedValue({
      status: "ok",
      app: "up",
      database: "up",
      timestamp: "2026-10-31T00:00:00.000Z",
    });
    vi.mocked(tickets.countByStatus).mockResolvedValue({ OPEN: 2, CLOSED: 7 });
    vi.mocked(sla.getSummary).mockResolvedValue({
      totalTickets: 9,
      response: { met: 5, breached: 3, pending: 1, complianceRate: 62.5 },
      resolution: { met: 6, breached: 2, pending: 1, complianceRate: 75 },
      tickets: [],
      contracts: [
        {
          contractId: "c1",
          contractCode: "CTR-1",
          contractTitle: "A",
          totalTickets: 9,
          breachedTickets: 3,
          responseComplianceRate: 62.5,
          resolutionComplianceRate: 75,
          alert: true,
          alertReasons: ["RECURRING_BREACHES"],
        },
      ],
    });
    vi.mocked(profitability.getSummary).mockResolvedValue({
      totalContracts: 2,
      deficitaryContracts: 1,
      totalContractValue: "5000.00",
      totalRevenue: "20000.00",
      totalHours: "40.00",
      totalCost: "3400.00",
      totalMargin: "16600.00",
      contracts: [],
    });

    await new MetricsService(health, sla, profitability, tickets).refresh();
    const body = await renderPrometheusMetrics();

    expect(body).toMatch(/slanko_tickets\{status="OPEN",app="slanko"\} 2/);
    expect(body).toMatch(/slanko_sla_breached_tickets\{metric="response",app="slanko"\} 3/);
    expect(body).toMatch(/slanko_sla_critical_contracts\{app="slanko"\} 1/);
    expect(body).toMatch(/slanko_deficitary_contracts\{app="slanko"\} 1/);
    expect(body).toMatch(/slanko_contracts_margin_brl\{app="slanko"\} 16600/);
  });

  it("skips business queries when the database is down", async () => {
    vi.mocked(health.check).mockResolvedValue({
      status: "degraded",
      app: "up",
      database: "down",
      timestamp: "2026-10-31T00:00:00.000Z",
    });

    await new MetricsService(health, sla, profitability, tickets).refresh();

    expect(sla.getSummary).not.toHaveBeenCalled();
    expect(tickets.countByStatus).not.toHaveBeenCalled();
  });
});
