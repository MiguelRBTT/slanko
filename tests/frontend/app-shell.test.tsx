import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import * as authSession from "@/lib/client/auth-session";

const replace = vi.fn();
const prefetch = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    replace,
    prefetch,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/app-shell.module.css", () => ({
  default: new Proxy(
    {},
    {
      get: (_target, key: string) => key,
    },
  ),
}));

const gestor = {
  id: "1",
  name: "Ana Gestor",
  email: "gestor@slanko.local",
  role: "GESTOR" as const,
  hourlyCost: "120.00",
  active: true,
};

describe("AppShell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replace.mockReset();
    prefetch.mockReset();
  });

  it("redirects to login when there is no session", async () => {
    vi.spyOn(authSession, "getSession").mockReturnValue(null);
    render(
      <AppShell>
        <p>conteudo</p>
      </AppShell>,
    );

    expect(screen.getByText("Carregando sessão…")).toBeTruthy();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("renders gestor navigation and logout", async () => {
    const user = userEvent.setup();
    vi.spyOn(authSession, "getSession").mockReturnValue({
      token: "t",
      user: gestor,
    });
    const clearSpy = vi.spyOn(authSession, "clearSession").mockImplementation(() => undefined);

    render(
      <AppShell>
        <p>conteudo</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ana Gestor")).toBeTruthy();
    });

    expect(screen.getByText("Gestor")).toBeTruthy();
    expect(screen.getByText("Painel")).toBeTruthy();
    expect(screen.getByText("Clientes")).toBeTruthy();
    expect(screen.getByText("Contratos")).toBeTruthy();
    expect(screen.getByText("Chamados")).toBeTruthy();
    expect(screen.getByText("conteudo")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(clearSpy).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("hides gestor-only links for tecnico and sends them to chamados", async () => {
    vi.spyOn(authSession, "getSession").mockReturnValue({
      token: "t",
      user: { ...gestor, name: "Bob", role: "TECNICO" },
    });

    render(
      <AppShell>
        <p>ok</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeTruthy();
    });

    expect(screen.getByText("Técnico")).toBeTruthy();
    expect(screen.queryByText("Painel")).toBeNull();
    expect(screen.getByText("Chamados")).toBeTruthy();
    expect(screen.queryByText("Clientes")).toBeNull();
    expect(screen.queryByText("Contratos")).toBeNull();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/tickets");
    });
  });
});
