import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UsersPage from "@/app/(app)/users/page";
import * as api from "@/lib/client/api";
import * as session from "@/lib/client/auth-session";

vi.mock("@/app/(app)/page-shared.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key: string) => key,
    },
  ),
}));

const gestor = {
  id: "u1",
  name: "Ana Gestora",
  email: "gestor@slanko.local",
  role: "GESTOR" as const,
  hourlyCost: "120.00",
  active: true,
};

const tecnico = {
  id: "u2",
  name: "Carlos Tecnico",
  email: "tecnico@slanko.local",
  role: "TECNICO" as const,
  hourlyCost: "85.50",
  active: true,
};

describe("UsersPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(session, "getSession").mockReturnValue({ token: "t", user: gestor });
    vi.spyOn(window, "confirm").mockReturnValue(true);

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

  it("lists the team with hourly cost and hides self-deactivation", async () => {
    const request = vi.spyOn(api, "apiRequest").mockResolvedValue({ users: [gestor, tecnico] });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Carlos Tecnico")).toBeTruthy();
    });

    expect(request).toHaveBeenCalledWith("/api/users?includeInactive=true");
    expect(screen.getByText("2 pessoas ativas")).toBeTruthy();
    expect(screen.getByText("R$ 85,50")).toBeTruthy();
    // Apenas o técnico pode ser desativado: o gestor logado não desativa a si mesmo.
    expect(screen.getAllByRole("button", { name: "Desativar" })).toHaveLength(1);
  });

  it("creates a person with hourly cost and password", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(api, "apiRequest");
    request
      .mockResolvedValueOnce({ users: [gestor] })
      .mockResolvedValueOnce({ user: tecnico })
      .mockResolvedValueOnce({ users: [gestor, tecnico] });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Gestora")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Nova pessoa" }));
    await user.type(screen.getByLabelText("Nome"), "Carlos Tecnico");
    await user.type(screen.getByLabelText("Email"), "tecnico@slanko.local");
    await user.type(screen.getByLabelText("Custo por hora"), "8550");
    await user.type(screen.getByLabelText("Senha inicial"), "Senha@123");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => {
      expect(screen.getByText("Carlos Tecnico")).toBeTruthy();
    });

    expect(request).toHaveBeenCalledWith("/api/users", {
      method: "POST",
      body: {
        name: "Carlos Tecnico",
        email: "tecnico@slanko.local",
        role: "TECNICO",
        hourlyCost: 85.5,
        password: "Senha@123",
      },
    });
  });

  it("validates cost and password before sending", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(api, "apiRequest").mockResolvedValue({ users: [gestor] });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Ana Gestora")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Nova pessoa" }));
    await user.type(screen.getByLabelText("Nome"), "Sem custo");
    await user.type(screen.getByLabelText("Email"), "x@slanko.local");
    await user.type(screen.getByLabelText("Senha inicial"), "Senha@123");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(screen.getByText(/Informe o custo por hora/)).toBeTruthy();

    await user.type(screen.getByLabelText("Custo por hora"), "9000");
    await user.clear(screen.getByLabelText("Senha inicial"));
    await user.type(screen.getByLabelText("Senha inicial"), "curta");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(screen.getByText(/pelo menos 8 caracteres/)).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("edits a person without changing the password when it is left blank", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(api, "apiRequest");
    request
      .mockResolvedValueOnce({ users: [gestor, tecnico] })
      .mockResolvedValueOnce({ user: tecnico })
      .mockResolvedValueOnce({ users: [gestor, tecnico] });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Carlos Tecnico")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Editar Carlos Tecnico" }));
    const cost = screen.getByLabelText("Custo por hora");
    await user.clear(cost);
    await user.type(cost, "9500");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith("/api/users/u2", {
        method: "PUT",
        body: {
          name: "Carlos Tecnico",
          email: "tecnico@slanko.local",
          hourlyCost: 95,
          role: "TECNICO",
        },
      });
    });
  });

  it("deactivates another person after confirmation", async () => {
    const user = userEvent.setup();
    const request = vi.spyOn(api, "apiRequest");
    request
      .mockResolvedValueOnce({ users: [gestor, tecnico] })
      .mockResolvedValueOnce({ user: { ...tecnico, active: false } })
      .mockResolvedValueOnce({ users: [gestor, { ...tecnico, active: false }] });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Carlos Tecnico")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Desativar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reativar" })).toBeTruthy();
    });
    expect(request).toHaveBeenCalledWith("/api/users/u2", { method: "PUT", body: { active: false } });
  });

  it("shows API errors on the list", async () => {
    vi.spyOn(api, "apiRequest").mockRejectedValue(new api.ApiClientError("Sem permissão", 403));

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Sem permissão")).toBeTruthy();
    });
  });
});
