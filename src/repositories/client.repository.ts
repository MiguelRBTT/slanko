import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Data access layer for Client entities.

export class ClientRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findAllActive() {
    return this.db.client.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  findById(id: string) {
    return this.db.client.findUnique({ where: { id } });
  }
}

export const clientRepository = new ClientRepository();
