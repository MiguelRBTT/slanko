import { describe, expect, it } from "vitest";
import { buildCreatedEvent, buildUpdateEvents, type TicketSnapshot } from "@/lib/tickets/events";

const base: TicketSnapshot = {
  title: "Servidor lento",
  description: "Detalhes",
  priority: "HIGH",
  category: "Infraestrutura",
  status: "OPEN",
  solution: null,
  assignedToId: null,
  assignedToName: null,
  observerIds: ["user-a"],
};

describe("ticket history events", () => {
  it("describes the initial state of a new ticket", () => {
    expect(
      buildCreatedEvent({ ...base, assignedToId: "user-t", assignedToName: "Carlos" }),
    ).toEqual({
      type: "CREATED",
      data: {
        status: "OPEN",
        priority: "HIGH",
        assignedTo: { id: "user-t", name: "Carlos" },
        observerIds: ["user-a"],
      },
    });
  });

  it("returns no events when nothing changed", () => {
    expect(buildUpdateEvents(base, { ...base, observerIds: ["user-a"] })).toEqual([]);
  });

  it("records status, assignee, observers and field changes", () => {
    const events = buildUpdateEvents(base, {
      ...base,
      status: "RESOLVED",
      solution: "Disco trocado",
      priority: "CRITICAL",
      assignedToId: "user-t",
      assignedToName: "Carlos",
      observerIds: ["user-b"],
    });

    expect(events).toEqual([
      { type: "STATUS_CHANGED", data: { from: "OPEN", to: "RESOLVED" } },
      {
        type: "ASSIGNEE_CHANGED",
        data: { from: null, to: { id: "user-t", name: "Carlos" } },
      },
      { type: "OBSERVERS_CHANGED", data: { added: ["user-b"], removed: ["user-a"] } },
      {
        type: "UPDATED",
        data: {
          fields: {
            priority: { from: "HIGH", to: "CRITICAL" },
            solution: { from: null, to: "Disco trocado" },
          },
        },
      },
    ]);
  });

  it("ignores observer order", () => {
    expect(
      buildUpdateEvents({ ...base, observerIds: ["a", "b"] }, { ...base, observerIds: ["b", "a"] }),
    ).toEqual([]);
  });

  it("detects different observer sets with the same size", () => {
    const events = buildUpdateEvents({ ...base, observerIds: ["a", "b"] }, { ...base, observerIds: ["a", "c"] });

    expect(events).toEqual([{ type: "OBSERVERS_CHANGED", data: { added: ["c"], removed: ["b"] } }]);
  });
});
