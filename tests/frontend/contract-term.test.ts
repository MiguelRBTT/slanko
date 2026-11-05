import { describe, expect, it } from "vitest";
import { describeContractTerm } from "@/lib/client/contract-term";

// 04/11/2026 ao meio-dia (horário local).
const today = new Date(2026, 10, 4, 12, 0, 0);

describe("describeContractTerm", () => {
  it("describes a running contract with an end date", () => {
    const term = describeContractTerm({ startDate: "2026-01-01", endDate: "2026-12-31", status: "ACTIVE" }, today);

    expect(term.range).toBe("01/01/2026 a 31/12/2026");
    expect(term.detail).toBe("Em vigência há 10 meses · termina em 57 dias");
    expect(term.state).toBe("running");
    expect(term.expired).toBe(false);
  });

  it("describes a running contract without an end date", () => {
    const term = describeContractTerm({ startDate: "2026-08-01", endDate: null, status: "ACTIVE" }, today);

    expect(term.range).toBe("Desde 01/08/2026");
    expect(term.detail).toBe("Em vigência há 3 meses · sem data de fim");
    expect(term.state).toBe("running");
  });

  it("uses days for short spans and months for long remaining terms", () => {
    expect(
      describeContractTerm({ startDate: "2026-10-20", endDate: "2027-07-31", status: "ACTIVE" }, today).detail,
    ).toBe("Em vigência há 15 dias · termina em 8 meses");
  });

  it("uses years and months after twelve months", () => {
    expect(
      describeContractTerm({ startDate: "2025-03-01", endDate: null, status: "ACTIVE" }, today).detail,
    ).toBe("Em vigência há 1 ano e 8 meses · sem data de fim");
    expect(
      describeContractTerm({ startDate: "2024-11-04", endDate: null, status: "ACTIVE" }, today).detail,
    ).toBe("Em vigência há 2 anos · sem data de fim");
  });

  it("handles contracts that start or end today", () => {
    expect(
      describeContractTerm({ startDate: "2026-11-04", endDate: "2026-11-05", status: "ACTIVE" }, today).detail,
    ).toBe("Começou hoje · termina amanhã");
    expect(
      describeContractTerm({ startDate: "2026-01-01", endDate: "2026-11-04", status: "ACTIVE" }, today).detail,
    ).toBe("Em vigência há 10 meses · termina hoje");
  });

  it("describes a contract that has not started yet", () => {
    const term = describeContractTerm({ startDate: "2026-12-01", endDate: null, status: "ACTIVE" }, today);

    expect(term.detail).toBe("Começa em 27 dias");
    expect(term.state).toBe("upcoming");
    expect(term.expired).toBe(false);
    expect(describeContractTerm({ startDate: "2026-11-05", endDate: null, status: "DRAFT" }, today).detail).toBe(
      "Começa amanhã",
    );
  });

  it("flags an active contract whose term already ended as expired", () => {
    const term = describeContractTerm({ startDate: "2025-03-01", endDate: "2026-02-28", status: "ACTIVE" }, today);

    expect(term.range).toBe("01/03/2025 a 28/02/2026");
    expect(term.detail).toBe("Terminou há 8 meses");
    expect(term.state).toBe("ended");
    expect(term.expired).toBe(true);
  });

  it("does not flag a finished contract as expired", () => {
    const term = describeContractTerm({ startDate: "2025-03-01", endDate: "2026-11-03", status: "FINISHED" }, today);

    expect(term.detail).toBe("Terminou há 1 dia");
    expect(term.state).toBe("ended");
    expect(term.expired).toBe(false);
  });
});
