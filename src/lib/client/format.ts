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

/** Converte texto digitado em pt-BR (ex.: R$ 10.000,50) para número. */
export function parseMoneyInput(raw: string): number {
  const trimmed = raw
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/r\$\s*/i, "")
    .trim();

  if (!trimmed) {
    return Number.NaN;
  }

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;

  return Number(normalized);
}

/** Máscara de moeda: cada dígito entra pela direita, como centavos. */
export function maskMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);

  if (!digits) {
    return "";
  }

  return formatMoneyBRL(Number(digits) / 100);
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

/** Máscara de minutos: só dígitos, exibidos como "45 min". */
export function maskMinutesInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 6);

  if (!digits) {
    return "";
  }

  return `${Number(digits).toLocaleString("pt-BR")} min`;
}

export function parseMinutesInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");

  if (!digits) {
    return Number.NaN;
  }

  return Number(digits);
}

/** Converte minutos inteiros para horas com 4 casas, para gravar no banco. */
export function minutesToHours(minutes: number): number {
  return Number((minutes / 60).toFixed(4));
}

export function hoursToMinutes(hours: number | string | null | undefined): number {
  const value = typeof hours === "string" ? Number(hours) : (hours ?? 0);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 60);
}

export function formatWorkedMinutes(hoursOrMinutes: number | string | null | undefined, alreadyMinutes = false): string {
  const minutes = alreadyMinutes ? Math.round(Number(hoursOrMinutes ?? 0)) : hoursToMinutes(hoursOrMinutes);

  return `${minutes.toLocaleString("pt-BR")} min`;
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
