import { describe, expect, it } from "vitest";
import {
  displayOrFallback,
  formatHours,
  formatMoneyBRL,
  formatMoneyInputValue,
  formatPercent,
  parseMoneyInput,
} from "@/lib/client/format";

describe("format helpers", () => {
  it("formats BRL currency", () => {
    expect(formatMoneyBRL(10000)).toBe("R$\u00a010.000,00");
    expect(formatMoneyBRL("4500.5")).toContain("4.500,50");
  });

  it("parses Brazilian money input", () => {
    expect(parseMoneyInput("10.000,50")).toBe(10000.5);
    expect(parseMoneyInput("4500")).toBe(4500);
  });

  it("formats percent and hours", () => {
    expect(formatPercent(95.5)).toBe("95,5%");
    expect(formatPercent(null)).toBe("Não informado");
    expect(formatHours("12.5")).toBe("12,50 h");
  });

  it("formats money input and fallback text", () => {
    expect(formatMoneyInputValue(10000)).toBe("10.000,00");
    expect(displayOrFallback(null)).toBe("Não informado");
    expect(displayOrFallback("  Acme  ")).toBe("Acme");
  });
});
