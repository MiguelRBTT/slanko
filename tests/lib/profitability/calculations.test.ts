import { describe, expect, it } from "vitest";
import { decimal } from "../../helpers/fixtures";
import {
  buildProfitabilityTotals,
  calculateContractProfitability,
  calculateEntryCost,
  calculateProratedRevenue,
  formatMoney,
  resolveRevenueWindow,
  toNumeric,
} from "@/lib/profitability/calculations";

describe("profitability calculations", () => {
  it("converts numeric values from numbers and string-like decimals", () => {
    expect(toNumeric(10)).toBe(10);
    expect(toNumeric("12.50")).toBe(12.5);
    expect(toNumeric(decimal("85.50"))).toBe(85.5);
  });

  it("formats money with two decimals", () => {
    expect(formatMoney(10)).toBe("10.00");
    expect(formatMoney(10.556)).toBe("10.56");
  });

  it("calculates entry cost from hours and hourly cost", () => {
    expect(calculateEntryCost(2, 85.5)).toBe(171);
  });

  it("calculates contract profitability with positive margin", () => {
    const result = calculateContractProfitability({
      contractValue: 4500,
      revenue: 4500,
      totalHours: 10,
      totalCost: 855,
    });

    expect(result.contractValue).toBe("4500.00");
    expect(result.totalCost).toBe("855.00");
    expect(result.margin).toBe("3645.00");
    expect(result.marginRate).toBe(81);
    expect(result.deficitary).toBe(false);
  });

  it("marks contracts as deficitary and handles zero contract value", () => {
    const deficitary = calculateContractProfitability({
      contractValue: 100,
      revenue: 100,
      totalHours: 5,
      totalCost: 500,
    });

    expect(deficitary.margin).toBe("-400.00");
    expect(deficitary.deficitary).toBe(true);

    const zeroValue = calculateContractProfitability({
      contractValue: 0,
      revenue: 0,
      totalHours: 1,
      totalCost: 50,
    });

    expect(zeroValue.marginRate).toBeNull();
    expect(zeroValue.deficitary).toBe(true);
  });

  it("builds profitability totals across contracts", () => {
    const totals = buildProfitabilityTotals([
      {
        contractValue: "4500.00",
        revenue: "4500.00",
        totalHours: "10.00",
        totalCost: "855.00",
        margin: "3645.00",
        deficitary: false,
      },
      {
        contractValue: "1000.00",
        revenue: "1000.00",
        totalHours: "20.00",
        totalCost: "1700.00",
        margin: "-700.00",
        deficitary: true,
      },
    ]);

    expect(totals.totalContracts).toBe(2);
    expect(totals.deficitaryContracts).toBe(1);
    expect(totals.totalContractValue).toBe("5500.00");
    expect(totals.totalHours).toBe("30.00");
    expect(totals.totalCost).toBe("2555.00");
    expect(totals.totalMargin).toBe("2945.00");
    expect(totals.totalRevenue).toBe("5500.00");
  });

  it("measures margin against the revenue of the period, not the monthly value", () => {
    const result = calculateContractProfitability({
      contractValue: 3000,
      revenue: 1500,
      totalHours: 20,
      totalCost: 1800,
    });

    expect(result.margin).toBe("-300.00");
    expect(result.marginRate).toBe(-20);
    expect(result.deficitary).toBe(true);
  });
});

describe("revenue window", () => {
  const today = new Date("2026-10-15T15:00:00.000Z");

  it("runs from contract start until today when no period is given", () => {
    const window = resolveRevenueWindow({
      contractStart: new Date("2026-01-01"),
      contractEnd: new Date("2026-12-31"),
      today,
    });

    expect(window?.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(window?.end.toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });

  it("intersects the requested period with the contract term", () => {
    const window = resolveRevenueWindow({
      contractStart: new Date("2026-03-10"),
      contractEnd: new Date("2026-06-30"),
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-04-30T23:59:59.999Z"),
      today,
    });

    expect(window?.start.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(window?.end.toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  it("returns null when the period is outside the contract term", () => {
    expect(
      resolveRevenueWindow({
        contractStart: new Date("2026-05-01"),
        contractEnd: null,
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-03-31T23:59:59.999Z"),
        today,
      }),
    ).toBeNull();
  });

  it("returns null for a contract that has not started yet", () => {
    expect(
      resolveRevenueWindow({ contractStart: new Date("2026-11-01"), contractEnd: null, today }),
    ).toBeNull();
  });
});

describe("prorated revenue", () => {
  it("counts whole months as the monthly value", () => {
    expect(
      calculateProratedRevenue(4500, {
        start: new Date("2026-01-01"),
        end: new Date("2026-03-31"),
      }),
    ).toBe(13500);
  });

  it("prorates partial months by calendar days", () => {
    // 15 de 30 dias de setembro + 10 de 31 dias de outubro.
    expect(
      calculateProratedRevenue(3100, {
        start: new Date("2026-09-16"),
        end: new Date("2026-10-10"),
      }),
    ).toBe(2550);
  });

  it("returns zero without a window or value", () => {
    expect(calculateProratedRevenue(4500, null)).toBe(0);
    expect(
      calculateProratedRevenue(0, { start: new Date("2026-01-01"), end: new Date("2026-01-31") }),
    ).toBe(0);
  });
});
