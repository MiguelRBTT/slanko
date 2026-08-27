import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Lightweight database connectivity checks for health endpoints.

export class HealthRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async pingDatabase(): Promise<boolean> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const healthRepository = new HealthRepository();
