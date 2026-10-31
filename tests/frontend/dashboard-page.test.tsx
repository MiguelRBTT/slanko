import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(app)/dashboard/page";
import * as api from "@/lib/client/api";
import * as session from "@/lib/client/auth-session";

vi.mock("@/app/(app)/dashboard/dashboard.module.css", () => ({
  default: new Proxy({}, { get: (_target, key: string) => key }),
}));

const slaSummary = {
  totalTickets: 4,
  response: { met: 1, breached: 3, pending: 0, complianceRate: 25 },
  resolution: { met: 1, breached: 3, pending: 0, complianceRate: 25 },
  tickets: [
    {
      ticketId: "t1",
      contractId: "c2",
      title: "Prontuario travando",
      status: "CLOSED",
      openedAt: "2026-08-05T12:00:00.000Z",
      response: { status: "BREACHED", elapsedMinutes: 120, targetMinutes: 30 },
      resolution: { status: "BREACHED", elapsedMinutes: 2880, targetMinutes: 240 },
    },
  ],
  contracts: [
    {
      contractId: "c2",
      contractCode: "CTR-2026-002",
      contractTitle: "Clinica",
      totalTickets: 4,
      breachedTickets: 3,
      responseComplianceRate: 25,
      resolutionComplianceRate: 25,
      alert: true,
      alertReasons: ["LOW_RESPONSE_COMPLIANCE", "RECURRING_BREACHES"],
    },
  ],
};

const profitSummary = {
  totalContracts: 1,
  deficitaryContracts: 1,
  totalContractValue: "800.00",
  totalRevenue: "2400.00",
  totalHours: "50.00",
  totalCost: "4100.00",
  totalMargin: "-1700.00",
  contracts: [
    {
      contractId: "c2",
      contractCode: "CTR-2026-002",
      contractTitle: "Clinica",
      clientId: "cl2",
      contractStatus: "ACTIVE",
      contractValue: "800.00",
      revenue: "2400.00",
      periodStart: "2026-08-01",
      periodEnd: "2026-10-31",
      totalHours: "50.00",
      totalCost: "4100.00",
      margin: "-1700.00",
      marginRate: -70.83,
      deficitary: true,
    },
  ],
};

function mockApi() {
  return vi.spyOn(api, "apiRequest").mockImplementation(async (path: string) => {
    if (path === "/api/clients") return { clients: [{ id: "cl2", name: "Clinica Bem Estar", active: true }] } as never;
    if (path === "/api/contracts") {
      return {
        contracts: [{ id: "c2", clientId: "cl2", code: "CTR-2026-002", title: "Clinica", status: "ACTIVE" }],
      } as never;
    }
    if (path.startsWith("/api/sla/summary")) return { summary: slaSummary } as never;
    if (path.startsWith("/api/profitability/summary")) return { summary: profitSummary } as never;
    return {} as never;
  });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(session, "getSession").mockReturnValue({
      token: "t",
      user: { id: "u1", name: "Ana", email: "a@x", role: "GESTOR", hourlyCost: "0", active: true },
    });
  });

  it("shows revenue, deficit and contracts with critical SLA (RF12/RF13)", async () => {
    mockApi();

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("Contratos com SLA crítico")).toBeTruthy());
    expect(screen.getByText("custo passou da receita")).toBeTruthy();
    expect(screen.getByText("01/08/2026 a 31/10/2026")).toBeTruthy();
    expect(screen.getByText("resposta abaixo de 80%; 3 ou mais chamados fora do prazo")).toBeTruthy();
    expect(screen.getByText("Prontuario travando")).toBeTruthy();
  });

  it("reloads indicators with client, contract, period and status filters (RF10)", async () => {
    const user = userEvent.setup();
    const request = mockApi();

    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("Contratos com SLA crítico")).toBeTruthy());
    await waitFor(() => expect(screen.getByRole("option", { name: "Clinica Bem Estar" })).toBeTruthy());

    await user.selectOptions(screen.getByLabelText("Cliente"), "cl2");
    await user.selectOptions(screen.getByLabelText("Situação"), "ALL");

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/api/sla/summary?status=ALL&clientId=cl2"),
    );
    expect(request).toHaveBeenCalledWith("/api/profitability/summary?status=ALL&clientId=cl2");
  });

  it("shows API errors", async () => {
    vi.spyOn(api, "apiRequest").mockRejectedValue(new api.ApiClientError("Sem permissão", 403));

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("Sem permissão")).toBeTruthy());
  });
});
