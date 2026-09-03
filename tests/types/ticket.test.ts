import { describe, expect, it } from "vitest";
import { toPublicTicket } from "@/types/ticket";

describe("toPublicTicket", () => {
  it("maps ticket fields to the public shape", () => {
    const ticket = toPublicTicket({
      id: "ticket-1",
      contractId: "contract-1",
      openedById: "user-1",
      assignedToId: "user-2",
      title: "Servidor lento",
      description: "Usuarios reportam lentidao.",
      priority: "HIGH",
      category: "Infraestrutura",
      status: "OPEN",
      openedAt: new Date("2026-08-19T10:00:00.000Z"),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      solution: null,
    });

    expect(ticket.openedAt).toBe("2026-08-19T10:00:00.000Z");
    expect(ticket.assignedToId).toBe("user-2");
  });
});
