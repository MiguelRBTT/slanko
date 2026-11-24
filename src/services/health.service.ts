import { HealthRepository, healthRepository } from "@/repositories/health.repository";
import { recordHealthCheck } from "@/lib/observability/metrics";

// Junta o status da aplicação e do banco para o monitoramento e o teste de fumaça do CI.

export type HealthStatus = {
  status: "ok" | "degraded";
  app: "up";
  database: "up" | "down";
  timestamp: string;
};

export class HealthService {
  constructor(private readonly health: HealthRepository = healthRepository) {}

  async check(): Promise<HealthStatus> {
    const databaseUp = await this.health.pingDatabase();
    const result: HealthStatus = {
      status: databaseUp ? "ok" : "degraded",
      app: "up",
      database: databaseUp ? "up" : "down",
      timestamp: new Date().toISOString(),
    };

    recordHealthCheck({
      status: result.status,
      database: result.database,
    });

    return result;
  }
}

export const healthService = new HealthService();
