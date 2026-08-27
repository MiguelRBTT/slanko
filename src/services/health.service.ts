import { HealthRepository, healthRepository } from "@/repositories/health.repository";

// Aggregates application and database status for monitoring and CI smoke checks.

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

    return {
      status: databaseUp ? "ok" : "degraded",
      app: "up",
      database: databaseUp ? "up" : "down",
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
