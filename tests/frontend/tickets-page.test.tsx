import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TicketsPage from "@/app/(app)/tickets/page";
import * as api from "@/lib/client/api";
import * as session from "@/lib/client/auth-session";
import type { PublicTicket } from "@/types/ticket";

vi.mock("@/app/(app)/page-shared.module.css", () => ({
  default: new Proxy({}, { get: (_target, key: string) => key }),
}));

vi.mock("@/app/(app)/tickets/ticket-attachments", () => ({
  AttachmentFileInput: () => null,
  PendingFilesList: () => null,
  TicketAttachmentGallery: () => null,
  uploadPendingFiles: vi.fn(),
}));

const baseTicket: PublicTicket = {
  id: "t1",
  contractId: "c1",
  openedById: "u-gestor",
  assignedToId: "u-tec",
  assignedToName: "Carlos Tecnico",
  observerIds: [],
  title: "Servidor lento",
  description: "Detalhes",
  priority: "HIGH",
  category: "Infra",
  status: "IN_PROGRESS",
  openedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
  responseMinutes: 60,
  resolutionMinutes: 480,
  firstResponseAt: new Date().toISOString(),
  resolvedAt: null,
  closedAt: null,
  solution: null,
  loggedHours: "0.75",
};

const tickets: PublicTicket[] = [
  baseTicket,
  {
    ...baseTicket,
    id: "t2",
    title: "Impressora parada",
    status: "OPEN",
    assignedToId: null,
    assignedToName: null,
    firstResponseAt: null,
    loggedHours: "0",
  },
  {
    ...baseTicket,
    id: "t3",
    title: "Backup antigo",
    status: "CLOSED",
    solution: "Feito",
    closedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
  },
];

const contracts = [
  {
    id: "c1",
    clientId: "cl1",
    code: "CTR-1",
    title: "Suporte",
    description: null,
    startDate: "2026-01-01",
    endDate: null,
    status: "ACTIVE",
    responseMinutes: 60,
    resolutionMinutes: 480,
  },
];

const users = [{ id: "u-tec", name: "Carlos Tecnico", email: "t@x", role: "TECNICO", active: true }];

function mockApi(extra: Record<string, unknown> = {}) {
  return vi.spyOn(api, "apiRequest").mockImplementation(async (path: string) => {
    if (path in extra) return extra[path] as never;
    if (path === "/api/tickets") return { tickets } as never;
    if (path === "/api/contracts") return { contracts } as never;
    if (path === "/api/users") return { users } as never;
    if (path.endsWith("/time-entries")) {
      return {
        timeEntries: [
          {
            id: "e1",
            ticketId: "t1",
            userId: "u-tec",
            hours: "0.75",
            note: "Diagnóstico",
            workedAt: new Date().toISOString(),
          },
        ],
      } as never;
    }
    if (path.endsWith("/events")) return { events: [] } as never;
    return {} as never;
  });
}

function loginAs(role: "GESTOR" | "TECNICO", id = role === "GESTOR" ? "u-gestor" : "u-tec") {
  vi.spyOn(session, "getSession").mockReturnValue({
    token: "t",
    user: { id, name: "Pessoa", email: "p@x", role, hourlyCost: "0", active: true },
  });
}

describe("TicketsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  it("lists tickets with the aggregated logged time and without per-ticket requests", async () => {
    loginAs("GESTOR");
    const request = mockApi();

    render(<TicketsPage />);

    await waitFor(() => expect(screen.getByText("Servidor lento")).toBeTruthy());
    // t1 e t3 têm 0,75 h (45 min) somadas no servidor; t2 não tem apontamento.
    expect(screen.getAllByText("45 min")).toHaveLength(2);
    expect(request.mock.calls.some(([path]) => String(path).endsWith("/time-entries"))).toBe(false);
  });

  it("only offers deletion for tickets opened by mistake (no time logged, not resolved)", async () => {
    loginAs("GESTOR");
    mockApi();

    render(<TicketsPage />);

    await waitFor(() => expect(screen.getByText("Impressora parada")).toBeTruthy());
    expect(screen.getAllByRole("button", { name: "Excluir chamado" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Histórico" })).toHaveLength(3);
  });

  it("opens the history panel, loading entries only for that ticket", async () => {
    const user = userEvent.setup();
    loginAs("GESTOR");
    const request = mockApi({
      "/api/tickets/t3/events": {
        events: [
          {
            id: "ev1",
            ticketId: "t3",
            type: "CREATED",
            actorId: "u-gestor",
            actorName: "Ana Gestora",
            data: {},
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });

    render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("Backup antigo")).toBeTruthy());

    await user.click(screen.getAllByRole("button", { name: "Histórico" })[2]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Histórico do chamado")).toBeTruthy();
    await waitFor(() => expect(within(dialog).getByText("Abriu o chamado")).toBeTruthy());
    expect(request).toHaveBeenCalledWith("/api/tickets/t3/time-entries");
  });

  it("lets the author correct a time entry", async () => {
    const user = userEvent.setup();
    loginAs("TECNICO");
    const request = mockApi();

    render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("Servidor lento")).toBeTruthy());

    await user.click(screen.getAllByRole("button", { name: "Apontar tempo" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(await within(dialog).findByRole("button", { name: "Corrigir apontamento" }));

    const minutes = within(dialog).getByLabelText("Minutos");
    await user.clear(minutes);
    await user.type(minutes, "30");
    await user.click(within(dialog).getByRole("button", { name: "Salvar correção" }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/tickets/t1/time-entries/e1",
        expect.objectContaining({ method: "PUT", body: expect.objectContaining({ hours: 0.5 }) }),
      ),
    );
  });

  it("shows the assignee picker to the gestor but only 'claim' to the tecnico", async () => {
    const user = userEvent.setup();
    loginAs("TECNICO");
    mockApi();

    render(<TicketsPage />);
    await waitFor(() => expect(screen.getByText("Servidor lento")).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "Novo chamado" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).queryByLabelText("Responsável")).toBeNull();
    expect(within(dialog).queryByText("Observadores")).toBeNull();
    expect(within(dialog).getByLabelText("Assumir este chamado")).toBeTruthy();
  });
});
