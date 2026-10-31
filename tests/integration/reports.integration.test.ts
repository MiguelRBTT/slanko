import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authenticateAuthorizationHeader } from "@/lib/auth/authorize";
import { signAccessToken } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/lib/errors/app-error";
import { REPORTABLE_CONTRACT_STATUSES } from "@/lib/reports/contract-status-filter";
import { slaService } from "@/services/sla.service";
import { profitabilityService } from "@/services/profitability.service";
import { createBaseData, prisma, resetDatabase } from "./db";

// Relatórios e autenticação com dados reais no MySQL.

describe("reports and auth (MySQL)", () => {
  let base: Awaited<ReturnType<typeof createBaseData>>;

  beforeEach(async () => {
    await resetDatabase();
    base = await createBaseData();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it("counts an overdue ticket without response as an SLA breach", async () => {
    await prisma.ticket.create({
      data: {
        contractId: base.contract.id,
        openedById: base.gestor.id,
        title: "Sem resposta",
        description: "D",
        priority: "HIGH",
        category: "C",
        status: "OPEN",
        openedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        responseMinutes: 60,
        resolutionMinutes: 480,
      },
    });

    const summary = await slaService.getSummary();

    expect(summary.response.breached).toBe(1);
    expect(summary.response.pending).toBe(0);
    expect(summary.resolution.pending).toBe(1);
  });

  it("computes prorated monthly revenue for a period", async () => {
    const summary = await profitabilityService.getSummary({
      workedFrom: new Date("2026-02-01T00:00:00.000Z"),
      workedTo: new Date("2026-03-31T23:59:59.999Z"),
    });

    expect(summary.contracts[0].revenue).toBe("6000.00");
    expect(summary.contracts[0].periodStart).toBe("2026-02-01");
    expect(summary.contracts[0].periodEnd).toBe("2026-03-31");
  });

  it("keeps finished contracts out by default and includes them with the status filter", async () => {
    await prisma.contract.update({ where: { id: base.contract.id }, data: { status: "FINISHED" } });

    expect((await profitabilityService.getSummary()).contracts).toHaveLength(0);
    expect(
      (await profitabilityService.getSummary({ contractStatuses: REPORTABLE_CONTRACT_STATUSES })).contracts,
    ).toHaveLength(1);
  });

  it("revokes access immediately when the user is deactivated", async () => {
    const token = await signAccessToken({ userId: base.tecnico.id, email: base.tecnico.email, role: "TECNICO" });

    await expect(authenticateAuthorizationHeader(`Bearer ${token}`, "/api/tickets")).resolves.toMatchObject({
      userId: base.tecnico.id,
    });

    await prisma.user.update({ where: { id: base.tecnico.id }, data: { active: false } });

    await expect(authenticateAuthorizationHeader(`Bearer ${token}`, "/api/tickets")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
