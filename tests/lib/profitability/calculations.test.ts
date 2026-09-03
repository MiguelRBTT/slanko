import { describe, expect, it } from "vitest";
import {
  buildProfitabilityTotals,
  calculateContractProfitability,
  calculateEntryCost,
  formatMoney,
  toNumeric,
} from "@/lib/profitability/calculations";

describe("profitability calculations", () => {
  it("converts numeric values from numbers and string-like decimals", () => {
    expect(toNumeric(10)).toBe(10);
    expect(toNumeric("12.50")).toBe(12.5);
    expect(toNumeric({ toString: () => "85.50" })).toBe(85.5);
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
      totalHours: 5,
      totalCost: 500,
    });

    expect(deficitary.margin).toBe("-400.00");
    expect(deficitary.deficitary).toBe(true);

    const zeroValue = calculateContractProfitability({
      contractValue: 0,
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
        totalHours: "10.00",
        totalCost: "855.00",
        margin: "3645.00",
        deficitary: false,
      },
      {
        contractValue: "1000.00",
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
  });
});
