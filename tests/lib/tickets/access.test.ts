import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors/app-error";
import { assertTicketAccess, canAccessTicket } from "@/lib/tickets/access";

const gestor = {
  userId: "gestor",
  email: "gestor@slanko.local",
  role: "GESTOR" as const,
};

const tecnico = {
  userId: "carlos",
  email: "carlos@slanko.local",
  role: "TECNICO" as const,
};

describe("ticket access", () => {
  it("allows gestor always", () => {
    expect(
      canAccessTicket(
        { openedById: "other", assignedToId: "someone", observers: [] },
        gestor,
      ),
    ).toBe(true);
  });

  it("allows assignee and observers", () => {
    expect(
      canAccessTicket(
        { openedById: "other", assignedToId: "carlos", observers: [] },
        tecnico,
      ),
    ).toBe(true);

    expect(
      canAccessTicket(
        {
          openedById: "other",
          assignedToId: "diana",
          observers: [{ userId: "carlos" }],
        },
        tecnico,
      ),
    ).toBe(true);
  });

  it("allows opener only while unassigned", () => {
    expect(
      canAccessTicket(
        { openedById: "carlos", assignedToId: null, observers: [] },
        tecnico,
      ),
    ).toBe(true);

    expect(
      canAccessTicket(
        { openedById: "carlos", assignedToId: "diana", observers: [] },
        tecnico,
      ),
    ).toBe(false);
  });

  it("throws when access is denied", () => {
    expect(() =>
      assertTicketAccess(
        { openedById: "other", assignedToId: "diana", observers: [] },
        tecnico,
      ),
    ).toThrow(ForbiddenError);
  });
});
