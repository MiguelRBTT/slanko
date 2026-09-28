/** Formatação de valores para a interface (pt-BR). */

export function formatMoneyBRL(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);

  if (!Number.isFinite(amount)) {
    return "R$ 0,00";
  }

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte texto digitado em pt-BR (ex.: 10.000,50) para número. */
export function parseMoneyInput(raw: string): number {
  const trimmed = raw.trim();

  if (!trimmed) {
    return Number.NaN;
  }

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;

  return Number(normalized);
}

export function formatMoneyInputValue(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(amount)) {
    return "";
  }

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Não informado";
  }

  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function formatHours(value: number | string | null | undefined): string {
  const hours = typeof value === "string" ? Number(value) : (value ?? 0);

  if (!Number.isFinite(hours)) {
    return "0,00 h";
  }

  return `${hours.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} h`;
}

export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return "Não informado";
  }

  const [year, month, day] = isoDate.slice(0, 10).split("-");

  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day}/${month}/${year}`;
}

export function displayOrFallback(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Não informado";
}
