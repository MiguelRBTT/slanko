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
      hourlyCost: 120,
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

  const tecnico2 = await prisma.user.upsert({
    where: { email: "tecnico2@slanko.local" },
    update: {},
    create: {
      name: "Diana Tecnica",
      email: "tecnico2@slanko.local",
      passwordHash,
      role: "TECNICO",
      hourlyCost: 80,
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

  const ticket = await prisma.ticket.upsert({
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
      responseMinutes: contract.responseMinutes,
      resolutionMinutes: contract.resolutionMinutes,
      // Atendimento iniciado 30 min após a abertura (status "Em andamento").
      firstResponseAt: new Date("2026-08-19T10:30:00.000Z"),
      events: {
        create: {
          type: "CREATED",
          actor: { connect: { id: gestor.id } },
          createdAt: new Date("2026-08-19T10:00:00.000Z"),
          data: {
            status: "OPEN",
            priority: "HIGH",
            assignedTo: { id: tecnico.id, name: tecnico.name },
            observerIds: [],
          },
        },
      },
    },
  });

  await prisma.ticketObserver.upsert({
    where: {
      ticketId_userId: {
        ticketId: ticket.id,
        userId: tecnico2.id,
      },
    },
    update: {},
    create: {
      ticketId: ticket.id,
      userId: tecnico2.id,
    },
  });

  await seedDemoScenario({ gestor, tecnico, tecnico2, healthyContract: contract });

  console.log("Seed completed:");
  console.log("- gestor@slanko.local / Slanko@123");
  console.log("- tecnico@slanko.local / Slanko@123 (responsavel do chamado demo)");
  console.log("- tecnico2@slanko.local / Slanko@123 (observador do chamado demo)");
  console.log("- clientes: Tech Solutions, Clinica Bem Estar, Alfa Contabil");
  console.log("- contratos: CTR-2026-001 (saudavel), CTR-2026-002 (deficitario + SLA critico), CTR-2025-010 (finalizado)");
}

const MS_PER_MINUTE = 60_000;

function at(iso) {
  return new Date(iso);
}

function plusMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

/**
 * Cria o chamado com observadores, apontamentos e histórico numa única escrita.
 * Idempotente: se o chamado já existe, não altera nada.
 */
async function ensureTicket(input) {
  const existing = await prisma.ticket.findUnique({ where: { id: input.id } });

  if (existing) {
    return existing;
  }

  const { contract, openedBy, assignee, observers = [], entries = [] } = input;
  const events = [
    {
      type: "CREATED",
      actorId: openedBy.id,
      createdAt: input.openedAt,
      data: {
        status: "OPEN",
        priority: input.priority,
        assignedTo: assignee ? { id: assignee.id, name: assignee.name } : null,
        observerIds: observers.map((user) => user.id),
        responseMinutes: contract.responseMinutes,
        resolutionMinutes: contract.resolutionMinutes,
      },
    },
  ];
  const worker = assignee ?? openedBy;

  if (input.firstResponseAt) {
    events.push({
      type: "STATUS_CHANGED",
      actorId: worker.id,
      createdAt: input.firstResponseAt,
      data: { from: "OPEN", to: "IN_PROGRESS" },
    });
  }

  entries.forEach((entry) => {
    events.push({
      type: "TIME_LOGGED",
      actorId: entry.user.id,
      createdAt: entry.workedAt,
      data: { timeEntryId: entry.id, hours: String(entry.hours), workedAt: entry.workedAt.toISOString(), note: entry.note },
    });
  });

  if (input.resolvedAt) {
    events.push({
      type: "STATUS_CHANGED",
      actorId: worker.id,
      createdAt: input.resolvedAt,
      data: { from: "IN_PROGRESS", to: "RESOLVED" },
    });
  }

  if (input.closedAt) {
    events.push({
      type: "STATUS_CHANGED",
      actorId: openedBy.id,
      createdAt: input.closedAt,
      data: { from: "RESOLVED", to: "CLOSED" },
    });
  }

  return prisma.ticket.create({
    data: {
      id: input.id,
      contractId: contract.id,
      openedById: openedBy.id,
      assignedToId: assignee ? assignee.id : null,
      title: input.title,
      description: input.description,
      priority: input.priority,
      category: input.category,
      status: input.status,
      openedAt: input.openedAt,
      responseMinutes: contract.responseMinutes,
      resolutionMinutes: contract.resolutionMinutes,
      firstResponseAt: input.firstResponseAt ?? null,
      resolvedAt: input.resolvedAt ?? null,
      closedAt: input.closedAt ?? null,
      solution: input.solution ?? null,
      observers: { create: observers.map((user) => ({ userId: user.id })) },
      timeEntries: {
        create: entries.map((entry) => ({
          id: entry.id,
          userId: entry.user.id,
          hours: entry.hours,
          // Custo/hora congelado no apontamento, como faz a aplicação.
          hourlyCost: entry.user.hourlyCost,
          note: entry.note,
          workedAt: entry.workedAt,
        })),
      },
      events: { create: events },
    },
  });
}

/**
 * Cenário de demonstração para a banca:
 * - CTR-2026-001: contrato saudável (SLA cumprido, margem positiva);
 * - CTR-2026-002: contrato subprecificado (deficitário) e com SLA crítico (violações recorrentes);
 * - CTR-2025-010: contrato finalizado, para mostrar o histórico com o filtro de situação.
 * Inclui também um chamado aberto agora, ainda dentro do prazo de SLA.
 */
async function seedDemoScenario({ gestor, tecnico, tecnico2, healthyContract }) {
  const clinic = await prisma.client.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Clinica Bem Estar",
      document: "23.456.789/0001-01",
      email: "ti@bemestar.local",
      phone: "(48) 98888-0000",
    },
  });

  const accounting = await prisma.client.upsert({
    where: { id: "00000000-0000-4000-8000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000003",
      name: "Alfa Contabil",
      document: "34.567.890/0001-12",
      email: "contato@alfacontabil.local",
      phone: "(48) 97777-0000",
    },
  });

  const underpriced = await prisma.contract.upsert({
    where: { code: "CTR-2026-002" },
    update: {},
    create: {
      clientId: clinic.id,
      code: "CTR-2026-002",
      title: "Suporte estacoes e sistema clinico",
      description: "Mensalidade baixa para o volume de atendimento (exemplo de contrato deficitario).",
      value: 800,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-07-31"),
      status: "ACTIVE",
      responseMinutes: 30,
      resolutionMinutes: 240,
    },
  });

  const finished = await prisma.contract.upsert({
    where: { code: "CTR-2025-010" },
    update: {},
    create: {
      clientId: accounting.id,
      code: "CTR-2025-010",
      title: "Suporte anual escritorio",
      description: "Contrato encerrado (aparece com o filtro de situacao Finalizados).",
      value: 2000,
      startDate: new Date("2025-03-01"),
      endDate: new Date("2026-02-28"),
      status: "FINISHED",
      responseMinutes: 120,
      resolutionMinutes: 1440,
    },
  });

  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  // Contrato saudável: respostas rápidas, resolução dentro do prazo, poucas horas.
  const healthyOpened = at("2026-09-02T13:00:00.000Z");
  await ensureTicket({
    id: id(201),
    contract: healthyContract,
    openedBy: gestor,
    assignee: tecnico,
    title: "Impressora fiscal sem comunicacao",
    description: "Caixa 2 nao imprime cupons desde a abertura da loja.",
    priority: "MEDIUM",
    category: "Hardware",
    status: "CLOSED",
    openedAt: healthyOpened,
    firstResponseAt: plusMinutes(healthyOpened, 20),
    resolvedAt: plusMinutes(healthyOpened, 180),
    closedAt: plusMinutes(healthyOpened, 240),
    solution: "Driver reinstalado e porta serial reconfigurada.",
    entries: [{ id: id(301), user: tecnico, hours: 1.5, note: "Diagnostico e correcao", workedAt: plusMinutes(healthyOpened, 120) }],
  });

  // Contrato deficitário + SLA crítico: muitas horas e respostas/resoluções fora do prazo.
  const clinicTickets = [
    { n: 211, title: "Prontuario eletronico travando", opened: "2026-08-05T12:00:00.000Z", hours: [6, 6] },
    { n: 212, title: "Rede da recepcao instavel", opened: "2026-08-19T11:00:00.000Z", hours: [6, 5] },
    { n: 213, title: "Backup noturno falhando", opened: "2026-09-10T22:00:00.000Z", hours: [8, 7] },
    { n: 214, title: "Estacoes lentas no consultorio 3", opened: "2026-10-06T13:30:00.000Z", hours: [6, 6] },
  ];

  for (const [index, ticket] of clinicTickets.entries()) {
    const openedAt = at(ticket.opened);
    await ensureTicket({
      id: id(ticket.n),
      contract: underpriced,
      openedBy: tecnico2,
      assignee: index % 2 === 0 ? tecnico : tecnico2,
      observers: index === 0 ? [gestor] : [],
      title: ticket.title,
      description: "Chamado recorrente do cliente; atendimento exigiu varias horas de trabalho.",
      priority: index === 2 ? "CRITICAL" : "HIGH",
      category: "Suporte",
      status: "CLOSED",
      openedAt,
      // Resposta após 2 h (meta 30 min) e resolução após 2 dias (meta 4 h): violações.
      firstResponseAt: plusMinutes(openedAt, 120),
      resolvedAt: plusMinutes(openedAt, 2 * 24 * 60),
      closedAt: plusMinutes(openedAt, 2 * 24 * 60 + 60),
      solution: "Problema contornado; recomendada revisao do escopo do contrato.",
      entries: ticket.hours.map((hours, i) => ({
        id: id(ticket.n * 10 + i),
        user: i === 0 ? tecnico : tecnico2,
        hours,
        note: i === 0 ? "Atendimento remoto" : "Visita presencial",
        workedAt: plusMinutes(openedAt, (i + 1) * 12 * 60),
      })),
    });
  }

  // Contrato finalizado: histórico preservado.
  const finishedOpened = at("2026-01-20T14:00:00.000Z");
  await ensureTicket({
    id: id(221),
    contract: finished,
    openedBy: gestor,
    assignee: tecnico2,
    title: "Migracao de e-mail do escritorio",
    description: "Migrar caixas de e-mail para o novo provedor.",
    priority: "LOW",
    category: "Servicos",
    status: "CLOSED",
    openedAt: finishedOpened,
    firstResponseAt: plusMinutes(finishedOpened, 60),
    resolvedAt: plusMinutes(finishedOpened, 20 * 60),
    closedAt: plusMinutes(finishedOpened, 24 * 60),
    solution: "Caixas migradas e regras de encaminhamento recriadas.",
    entries: [{ id: id(311), user: tecnico2, hours: 4, note: "Migracao das caixas", workedAt: plusMinutes(finishedOpened, 6 * 60) }],
  });

  // Chamado aberto agora: ainda dentro do prazo (aparece como pendente, com contagem regressiva).
  const now = new Date();
  await ensureTicket({
    id: id(231),
    contract: healthyContract,
    openedBy: tecnico,
    assignee: null,
    title: "Usuario sem acesso a VPN",
    description: "Colaboradora nova nao consegue conectar na VPN.",
    priority: "MEDIUM",
    category: "Acesso",
    status: "OPEN",
    openedAt: plusMinutes(now, -10),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
