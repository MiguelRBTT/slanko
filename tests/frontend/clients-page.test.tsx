import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientsPage from "@/app/(app)/clients/page";
import * as api from "@/lib/client/api";

vi.mock("@/app/(app)/page-shared.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key: string) => key,
    },
  ),
}));

describe("ClientsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

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

  it("lists clients from the API", async () => {
    vi.spyOn(api, "apiRequest").mockResolvedValue({
      clients: [
        {
          id: "c1",
          name: "Acme",
          document: null,
          email: "a@acme.com",
          phone: null,
          active: true,
        },
      ],
    });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme")).toBeTruthy();
    });
    expect(screen.getByText("a@acme.com")).toBeTruthy();
    expect(screen.getByText("Ativo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar informações do cliente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Desativar cliente" })).toBeTruthy();
  });

  it("creates a client and reloads the list", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(api, "apiRequest");
    request
      .mockResolvedValueOnce({ clients: [] })
      .mockResolvedValueOnce({
        client: {
          id: "c2",
          name: "Nova",
          document: null,
          email: null,
          phone: null,
          active: true,
        },
      })
      .mockResolvedValueOnce({
        clients: [
          {
            id: "c2",
            name: "Nova",
            document: null,
            email: null,
            phone: null,
            active: true,
          },
        ],
      });

    render(<ClientsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum cliente ativo. Clique em Novo cliente para cadastrar o primeiro."),
      ).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Novo cliente" }));
    await user.type(screen.getByLabelText("Nome"), "Nova");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => {
      expect(screen.getByText("Nova")).toBeTruthy();
    });
  });

  it("shows list error from ApiClientError", async () => {
    vi.spyOn(api, "apiRequest").mockRejectedValue(new api.ApiClientError("Sem permissão", 403));

    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText("Sem permissão")).toBeTruthy();
    });
  });
});
