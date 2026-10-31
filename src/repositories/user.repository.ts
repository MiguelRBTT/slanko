import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Data access layer for User entities (Prisma only, no business rules).

export class UserRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findAllActive() {
    return this.db.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  findAll() {
    return this.db.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.db.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({ where: { id }, data });
  }
}

export const userRepository = new UserRepository();
