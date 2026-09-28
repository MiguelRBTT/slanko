import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import * as api from "@/lib/client/api";
import * as authSession from "@/lib/client/auth-session";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock("@/app/login/login.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key: string) => key,
    },
  ),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replace.mockReset();
  });

  it("redirects to dashboard when already logged in", async () => {
    vi.spyOn(authSession, "getSession").mockReturnValue({
      token: "t",
      user: {
        id: "1",
        name: "Gestor",
        email: "gestor@slanko.local",
        role: "GESTOR",
        hourlyCost: "1",
        active: true,
      },
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("logs in and stores session", async () => {
    const user = userEvent.setup();
    vi.spyOn(authSession, "getSession").mockReturnValue(null);
    const saveSpy = vi.spyOn(authSession, "saveSession").mockImplementation(() => undefined);
    vi.spyOn(api, "apiRequest").mockResolvedValue({
      token: "jwt",
      user: {
        id: "1",
        name: "Gestor",
        email: "gestor@slanko.local",
        role: "GESTOR",
        hourlyCost: "1",
        active: true,
      },
    });

    render(<LoginPage />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "gestor@slanko.local");
    await user.clear(screen.getByLabelText("Senha"));
    await user.type(screen.getByLabelText("Senha"), "Slanko@123");
    await user.click(screen.getByRole("button", { name: "Acessar painel" }));

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects tecnico login to tickets", async () => {
    const user = userEvent.setup();
    vi.spyOn(authSession, "getSession").mockReturnValue(null);
    vi.spyOn(authSession, "saveSession").mockImplementation(() => undefined);
    vi.spyOn(api, "apiRequest").mockResolvedValue({
      token: "jwt",
      user: {
        id: "2",
        name: "Técnico",
        email: "tecnico@slanko.local",
        role: "TECNICO",
        hourlyCost: "1",
        active: true,
      },
    });

    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "Acessar painel" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/tickets");
    });
  });

  it("shows ApiClientError message on failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(authSession, "getSession").mockReturnValue(null);
    vi.spyOn(api, "apiRequest").mockRejectedValue(new api.ApiClientError("Credenciais inválidas", 401));

    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "Acessar painel" }));

    await waitFor(() => {
      expect(screen.getByText("Credenciais inválidas")).toBeTruthy();
    });
  });
});
