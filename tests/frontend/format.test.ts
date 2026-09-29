import { describe, expect, it } from "vitest";
import {
  displayOrFallback,
  formatHours,
  formatMoneyBRL,
  formatMoneyInputValue,
  formatPercent,
  formatWorkedMinutes,
  hoursToMinutes,
  maskMinutesInput,
  maskMoneyInput,
  minutesToHours,
  parseMinutesInput,
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
    expect(parseMoneyInput("R$ 10.000,50")).toBe(10000.5);
  });

  it("masks money input as the user types digits", () => {
    expect(maskMoneyInput("")).toBe("");
    expect(maskMoneyInput("1")).toBe(formatMoneyBRL(0.01));
    expect(maskMoneyInput("150")).toBe(formatMoneyBRL(1.5));
    expect(maskMoneyInput("450000")).toBe(formatMoneyBRL(4500));
    expect(parseMoneyInput(maskMoneyInput("1000050"))).toBe(10000.5);
  });

  it("masks and converts worked minutes", () => {
    expect(maskMinutesInput("")).toBe("");
    expect(maskMinutesInput("45")).toBe("45 min");
    expect(maskMinutesInput("45 min")).toBe("45 min");
    expect(maskMinutesInput("1500")).toBe("1.500 min");
    expect(parseMinutesInput("45 min")).toBe(45);
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(40)).toBe(0.6667);
    expect(hoursToMinutes("1.50")).toBe(90);
    expect(formatWorkedMinutes("0.75")).toBe("45 min");
    expect(formatWorkedMinutes(135, true)).toBe("135 min");
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
