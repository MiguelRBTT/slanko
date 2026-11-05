import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContractsPage from "@/app/(app)/contracts/page";
import * as api from "@/lib/client/api";

vi.mock("@/app/(app)/page-shared.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key: string) => key,
    },
  ),
}));

const client = { id: "cl1", name: "Tech Solutions", document: null, email: null, phone: null, active: true };

const baseContract = {
  clientId: "cl1",
  description: null as string | null,
  value: "4500.00",
  status: "ACTIVE",
  responseMinutes: 60,
  resolutionMinutes: 480,
};

const contracts = [
  { ...baseContract, id: "k1", code: "CTR-001", title: "Suporte mensal", startDate: "2026-01-01", endDate: "2026-12-31" },
  { ...baseContract, id: "k2", code: "CTR-002", title: "Sem prazo", startDate: "2026-08-01", endDate: null },
  { ...baseContract, id: "k3", code: "CTR-003", title: "Vencido", startDate: "2025-03-01", endDate: "2026-02-28" },
];

function mockApi(list = contracts) {
  return vi.spyOn(api, "apiRequest").mockImplementation(async (path: string, options?: { method?: string }) => {
    if (path === "/api/clients") return { clients: [client] } as never;
    if (path === "/api/contracts" && !options?.method) return { contracts: list } as never;
    return { contract: list[0] } as never;
  });
}

describe("ContractsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Só o relógio é fixado (04/11/2026); os temporizadores seguem reais para o userEvent.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0));

    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute("open", "");
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute("open");
      };
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the term of each contract and flags the expired one", async () => {
    mockApi();

    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByText("01/01/2026 a 31/12/2026")).toBeTruthy();
    });
    expect(screen.getByText("Em vigência há 10 meses · termina em 57 dias")).toBeTruthy();
    expect(screen.getByText("Desde 01/08/2026")).toBeTruthy();
    expect(screen.getByText("Em vigência há 3 meses · sem data de fim")).toBeTruthy();
    expect(screen.getByText("Terminou há 8 meses")).toBeTruthy();
    expect(screen.getAllByText("Vencido").some((node) => node.classList.contains("badge-warn"))).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("1 contrato ativo está com a vigência vencida.");
  });

  it("sends the end date and description when creating a contract", async () => {
    const user = userEvent.setup();
    const request = mockApi([]);

    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum contrato cadastrado/)).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Novo contrato" }));
    await user.type(screen.getByLabelText("Código"), "CTR-010");
    await user.type(screen.getByLabelText("Título"), "Suporte anual");
    await user.type(screen.getByLabelText("Fim da vigência (opcional)"), "2026-12-31");
    await user.type(screen.getByLabelText("Descrição (opcional)"), "Estações e servidor");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        "/api/contracts",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            description: "Estações e servidor",
          }),
        }),
      );
    });
  });

  it("sends a null end date when the field is left empty", async () => {
    const user = userEvent.setup();
    const request = mockApi([]);

    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum contrato cadastrado/)).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Novo contrato" }));
    await user.type(screen.getByLabelText("Código"), "CTR-011");
    await user.type(screen.getByLabelText("Título"), "Sem prazo");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        "/api/contracts",
        expect.objectContaining({ body: expect.objectContaining({ endDate: null, description: null }) }),
      );
    });
  });

  it("refuses an end date before the start date", async () => {
    const user = userEvent.setup();
    const request = mockApi([]);

    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum contrato cadastrado/)).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Novo contrato" }));
    await user.type(screen.getByLabelText("Código"), "CTR-012");
    await user.type(screen.getByLabelText("Título"), "Datas trocadas");
    await user.type(screen.getByLabelText("Fim da vigência (opcional)"), "2025-12-31");

    // O campo tem min = início, então o navegador já barra o envio pelo botão.
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));
    expect(request).not.toHaveBeenCalledWith("/api/contracts", expect.objectContaining({ method: "POST" }));

    // Se o envio passar mesmo assim, a própria tela recusa antes de chamar a API.
    fireEvent.submit(screen.getByRole("button", { name: "Cadastrar" }).closest("form") as HTMLFormElement);
    expect(await screen.findByText("O fim da vigência não pode ser antes do início.")).toBeTruthy();
    expect(request).not.toHaveBeenCalledWith("/api/contracts", expect.objectContaining({ method: "POST" }));
  });

  it("loads the current end date and description when editing", async () => {
    const user = userEvent.setup();
    mockApi([{ ...contracts[0], description: "Escopo atual" }]);

    render(<ContractsPage />);
    await waitFor(() => {
      expect(screen.getByText("01/01/2026 a 31/12/2026")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Editar informações do contrato" }));

    expect((screen.getByLabelText("Fim da vigência (opcional)") as HTMLInputElement).value).toBe("2026-12-31");
    expect((screen.getByLabelText("Descrição (opcional)") as HTMLTextAreaElement).value).toBe("Escopo atual");
  });
});
