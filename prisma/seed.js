const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Slanko@123", 10);

  const gestor = await prisma.user.upsert({
    where: { email: "gestor@slanko.local" },
    update: {},
    create: {
      name: "Ana Gestora",
      email: "gestor@slanko.local",
      passwordHash,
      role: "GESTOR",
      hourlyCost: 0,
    },
  });

  const tecnico = await prisma.user.upsert({
    where: { email: "tecnico@slanko.local" },
    update: {},
    create: {
      name: "Carlos Tecnico",
      email: "tecnico@slanko.local",
      passwordHash,
      role: "TECNICO",
      hourlyCost: 85.5,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Tech Solutions Ltda",
      document: "12.345.678/0001-90",
      email: "contato@techsolutions.local",
      phone: "(48) 99999-0000",
    },
  });

  const contract = await prisma.contract.upsert({
    where: { code: "CTR-2026-001" },
    update: {},
    create: {
      clientId: client.id,
      code: "CTR-2026-001",
      title: "Suporte mensal infraestrutura",
      description: "Contrato de suporte tecnico com SLA padrao.",
      value: 4500,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "ACTIVE",
      responseMinutes: 60,
      resolutionMinutes: 480,
    },
  });

  await prisma.ticket.upsert({
    where: { id: "00000000-0000-4000-8000-000000000101" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000101",
      contractId: contract.id,
      openedById: gestor.id,
      assignedToId: tecnico.id,
      title: "Servidor de arquivos lento",
      description: "Usuarios reportam lentidao ao acessar pastas compartilhadas.",
      priority: "HIGH",
      category: "Infraestrutura",
      status: "IN_PROGRESS",
      openedAt: new Date("2026-08-19T10:00:00.000Z"),
    },
  });

  console.log("Seed completed:");
  console.log("- gestor@slanko.local / Slanko@123");
  console.log("- tecnico@slanko.local / Slanko@123");
  console.log("- client:", client.name);
  console.log("- contract:", contract.code);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
