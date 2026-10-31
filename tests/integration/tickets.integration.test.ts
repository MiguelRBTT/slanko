import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors/app-error";
import { ticketService } from "@/services/ticket.service";
import { timeEntryService } from "@/services/time-entry.service";
import { profitabilityService } from "@/services/profitability.service";
import { createBaseData, prisma, resetDatabase } from "./db";

// Fluxo real de chamado contra o MySQL: histórico atômico, 1ª resposta, custo congelado
// e regras de exclusão. Nada de mocks: services → repositories → Prisma → banco.

describe("ticket flow (MySQL)", () => {
  let base: Awaited<ReturnType<typeof createBaseData>>;

  beforeEach(async () => {
    await resetDatabase();
    base = await createBaseData();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("opens a ticket with frozen SLA targets and a CREATED event", async () => {
    const ticket = await ticketService.createTicket(
      {
        contractId: base.contract.id,
        title: "Servidor lento",
        description: "Detalhes",
        priority: "HIGH",
        category: "Infra",
        assignedToId: base.tecnico.id,
      },
      base.gestorAuth,
    );

    expect(ticket.responseMinutes).toBe(60);
    expect(ticket.firstResponseAt).toBeNull();

    // Mudar a meta do contrato depois não altera o chamado já aberto.
    await prisma.contract.update({ where: { id: base.contract.id }, data: { responseMinutes: 5 } });
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.responseMinutes).toBe(60);

    const events = await ticketService.listEvents(ticket.id, base.gestorAuth);
    expect(events.map((event) => event.type)).toEqual(["CREATED"]);
    expect(events[0].actorName).toBe("Ana Gestora");
  });

  it("records status and field changes in the history together with the update", async () => {
    const ticket = await ticketService.createTicket(
      { contractId: base.contract.id, title: "A", description: "D", priority: "LOW", category: "C" },
      base.gestorAuth,
    );

    await ticketService.updateTicket(
      ticket.id,
      { status: "IN_PROGRESS", assignedToId: base.tecnico.id, title: "B" },
      base.gestorAuth,
    );

    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.firstResponseAt).not.toBeNull();

    const types = (await ticketService.listEvents(ticket.id, base.gestorAuth)).map((event) => event.type);
    expect(types).toEqual(["CREATED", "STATUS_CHANGED", "ASSIGNEE_CHANGED", "UPDATED"]);
  });

  it("freezes the hourly cost on the time entry and keeps past margins stable", async () => {
    const ticket = await ticketService.createTicket(
      {
        contractId: base.contract.id,
        title: "Backup",
        description: "D",
        priority: "MEDIUM",
        category: "C",
        assignedToId: base.tecnico.id,
      },
      base.gestorAuth,
    );

    await timeEntryService.createTimeEntry(
      ticket.id,
      { hours: 2, workedAt: new Date().toISOString(), note: "Diagnóstico" },
      base.tecnicoAuth,
    );

    // 1º apontamento marca a 1ª resposta e gera TIME_LOGGED.
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(stored.firstResponseAt).not.toBeNull();

    const before = await profitabilityService.getContractReport(base.contract.id);
    expect(before.contract.totalCost).toBe("160.00");

    // Reajuste do técnico não reescreve o custo do apontamento já feito.
    await prisma.user.update({ where: { id: base.tecnico.id }, data: { hourlyCost: 200 } });
    const after = await profitabilityService.getContractReport(base.contract.id);
    expect(after.contract.totalCost).toBe("160.00");

    const [listed] = await ticketService.listTickets(base.gestorAuth);
    expect(Number(listed.loggedHours)).toBe(2);
  });

  it("corrects a time entry and keeps the previous value in the history", async () => {
    const ticket = await ticketService.createTicket(
      {
        contractId: base.contract.id,
        title: "VPN",
        description: "D",
        priority: "LOW",
        category: "C",
        assignedToId: base.tecnico.id,
      },
      base.gestorAuth,
    );
    const entry = await timeEntryService.createTimeEntry(
      ticket.id,
      { hours: 3, workedAt: new Date().toISOString() },
      base.tecnicoAuth,
    );

    await timeEntryService.updateTimeEntry(ticket.id, entry.id, { hours: 1 }, base.tecnicoAuth);

    const corrected = (await ticketService.listEvents(ticket.id, base.gestorAuth)).find(
      (event) => event.type === "TIME_UPDATED",
    );
    expect(corrected?.data).toMatchObject({ from: { hours: "3" }, to: { hours: "1" } });
  });

  it("refuses to delete a ticket that has logged time", async () => {
    const ticket = await ticketService.createTicket(
      {
        contractId: base.contract.id,
        title: "Impressora",
        description: "D",
        priority: "LOW",
        category: "C",
        assignedToId: base.tecnico.id,
      },
      base.gestorAuth,
    );
    await timeEntryService.createTimeEntry(
      ticket.id,
      { hours: 1, workedAt: new Date().toISOString() },
      base.tecnicoAuth,
    );

    await expect(ticketService.deleteTicket(ticket.id, base.gestorAuth)).rejects.toBeInstanceOf(ConflictError);
    expect(await prisma.ticket.count({ where: { id: ticket.id } })).toBe(1);
    expect(await prisma.timeEntry.count({ where: { ticketId: ticket.id } })).toBe(1);
  });
});
