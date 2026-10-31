import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { assertTestDatabase } from "./global-setup";

/** Limpa todas as tabelas (ordem das chaves estrangeiras). */
export async function resetDatabase() {
  // Nunca apaga dados fora de um banco *_test.
  assertTestDatabase(process.env.DATABASE_URL ?? "");

  await prisma.ticketEvent.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketObserver.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

export async function createBaseData() {
  const passwordHash = await hashPassword("Slanko@123");
  const gestor = await prisma.user.create({
    data: { name: "Ana Gestora", email: "gestor@test.local", passwordHash, role: "GESTOR", hourlyCost: 120 },
  });
  const tecnico = await prisma.user.create({
    data: { name: "Carlos Tecnico", email: "tecnico@test.local", passwordHash, role: "TECNICO", hourlyCost: 80 },
  });
  const client = await prisma.client.create({ data: { name: "Cliente Teste" } });
  const contract = await prisma.contract.create({
    data: {
      clientId: client.id,
      code: `CTR-${Date.now()}`,
      title: "Suporte mensal",
      value: 3000,
      startDate: new Date("2026-01-01"),
      endDate: null,
      status: "ACTIVE",
      responseMinutes: 60,
      resolutionMinutes: 480,
    },
  });

  return {
    gestor,
    tecnico,
    client,
    contract,
    gestorAuth: { userId: gestor.id, email: gestor.email, role: gestor.role },
    tecnicoAuth: { userId: tecnico.id, email: tecnico.email, role: tecnico.role },
  };
}

export { prisma };
