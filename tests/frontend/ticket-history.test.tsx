import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketHistory } from "@/app/(app)/tickets/ticket-history";
import * as api from "@/lib/client/api";
import { describeTicketEvent, formatEventDateTime } from "@/lib/client/ticket-history";

vi.mock("@/app/(app)/page-shared.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key: string) => key,
    },
  ),
}));

const names: Record<string, string> = { "user-a": "Diana", "user-b": "Bruno" };
const userName = (id: string) => names[id] ?? "usuário";

describe("describeTicketEvent", () => {
  it("describes creation with and without assignee", () => {
    expect(describeTicketEvent({ type: "CREATED", data: { status: "OPEN" } })).toBe("Abriu o chamado");
    expect(
      describeTicketEvent({
        type: "CREATED",
        data: { assignedTo: { id: "user-t", name: "Carlos" } },
      }),
    ).toBe("Abriu o chamado e atribuiu a Carlos");
  });

  it("describes status, assignee and observer changes in Portuguese", () => {
    expect(
      describeTicketEvent({ type: "STATUS_CHANGED", data: { from: "OPEN", to: "RESOLVED" } }),
    ).toBe("Mudou a situação: Aberto → Resolvido");
    expect(
      describeTicketEvent({
        type: "ASSIGNEE_CHANGED",
        data: { from: null, to: { id: "user-t", name: "Carlos" } },
      }),
    ).toBe("Mudou o responsável: sem responsável → Carlos");
    expect(
      describeTicketEvent(
        { type: "OBSERVERS_CHANGED", data: { added: ["user-a"], removed: ["user-b"] } },
        userName,
      ),
    ).toBe("Observadores: adicionou Diana; removeu Bruno");
  });

  it("describes field corrections, time and attachments", () => {
    expect(
      describeTicketEvent({
        type: "UPDATED",
        data: {
          fields: {
            title: { from: "A", to: "B" },
            priority: { from: "LOW", to: "CRITICAL" },
            solution: { from: null, to: "Feito" },
          },
        },
      }),
    ).toBe('Corrigiu título: "A" → "B"; prioridade: Baixa → Crítica; solução registrada');
    expect(describeTicketEvent({ type: "TIME_LOGGED", data: { hours: "0.75" } })).toBe("Apontou 45 min");
    expect(
      describeTicketEvent({ type: "TIME_UPDATED", data: { from: { hours: "1" }, to: { hours: "0.5" } } }),
    ).toBe("Corrigiu um apontamento: 60 min → 30 min");
    expect(describeTicketEvent({ type: "TIME_DELETED", data: { hours: "0.25" } })).toBe(
      "Excluiu um apontamento de 15 min",
    );
    expect(describeTicketEvent({ type: "ATTACHMENT_ADDED", data: { fileName: "erro.png" } })).toBe(
      "Anexou erro.png",
    );
    expect(describeTicketEvent({ type: "ATTACHMENT_REMOVED", data: { fileName: "erro.png" } })).toBe(
      "Removeu o anexo erro.png",
    );
  });

  it("formats event timestamps and keeps invalid input", () => {
    expect(formatEventDateTime("2026-08-19T10:05:00.000Z")).toMatch(/19\/08\/2026/);
    expect(formatEventDateTime("invalid")).toBe("invalid");
  });
});

describe("TicketHistory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and lists the ticket events", async () => {
    const request = vi.spyOn(api, "apiRequest").mockResolvedValue({
      events: [
        {
          id: "e1",
          ticketId: "t1",
          type: "CREATED",
          actorId: "u1",
          actorName: "Ana Gestora",
          data: {},
          createdAt: "2026-08-19T10:00:00.000Z",
        },
      ],
    });

    render(<TicketHistory ticketId="t1" userName={userName} />);

    await waitFor(() => {
      expect(screen.getByText("Abriu o chamado")).toBeTruthy();
    });
    expect(screen.getByText("Ana Gestora")).toBeTruthy();
    expect(request).toHaveBeenCalledWith("/api/tickets/t1/events");
  });

  it("shows API errors", async () => {
    vi.spyOn(api, "apiRequest").mockRejectedValue(new api.ApiClientError("Sem permissão", 403));

    render(<TicketHistory ticketId="t1" userName={userName} />);

    await waitFor(() => {
      expect(screen.getByText("Sem permissão")).toBeTruthy();
    });
  });
});
