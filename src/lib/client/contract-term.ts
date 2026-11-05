import { formatDateBR } from "@/lib/client/format";

export type ContractTermState = "upcoming" | "running" | "ended";

export type ContractTerm = {
  /** Período da vigência, ex.: "01/01/2026 a 31/12/2026" ou "Desde 01/01/2026". */
  range: string;
  /** Tempo decorrido e restante, ex.: "Em vigência há 10 meses · termina em 57 dias". */
  detail: string;
  state: ContractTermState;
  /** Contrato ainda marcado como Ativo com a vigência já terminada: precisa ser finalizado ou renovado. */
  expired: boolean;
};

const MS_PER_DAY = 86_400_000;
/** Até este número de dias o tempo restante aparece em dias, que é o que importa perto do fim. */
const REMAINING_DAYS_LIMIT = 60;

type DateParts = { year: number; month: number; day: number };

function parseIsoDate(value: string): DateParts {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

/** Dia de hoje no horário local, que é o dia que a pessoa vê no calendário. */
function localDay(date: Date): DateParts {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function daysBetween(from: DateParts, to: DateParts): number {
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / MS_PER_DAY,
  );
}

function wholeMonthsBetween(from: DateParts, to: DateParts): number {
  const months = (to.year - from.year) * 12 + (to.month - from.month);
  return to.day < from.day ? months - 1 : months;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Duração legível entre duas datas: dias até completar um mês, depois meses, depois anos e meses. */
function spanLabel(from: DateParts, to: DateParts): string {
  const months = wholeMonthsBetween(from, to);

  if (months < 1) {
    return plural(daysBetween(from, to), "dia", "dias");
  }

  if (months < 12) {
    return plural(months, "mês", "meses");
  }

  const years = plural(Math.floor(months / 12), "ano", "anos");
  const rest = months % 12;
  return rest === 0 ? years : `${years} e ${plural(rest, "mês", "meses")}`;
}

function remainingLabel(today: DateParts, end: DateParts): string {
  const days = daysBetween(today, end);

  if (days === 0) return "termina hoje";
  if (days === 1) return "termina amanhã";
  if (days <= REMAINING_DAYS_LIMIT) return `termina em ${days} dias`;
  return `termina em ${spanLabel(today, end)}`;
}

export function describeContractTerm(
  contract: { startDate: string; endDate: string | null; status: string },
  now: Date = new Date(),
): ContractTerm {
  const today = localDay(now);
  const start = parseIsoDate(contract.startDate);
  const end = contract.endDate ? parseIsoDate(contract.endDate) : null;
  const range = end
    ? `${formatDateBR(contract.startDate)} a ${formatDateBR(contract.endDate)}`
    : `Desde ${formatDateBR(contract.startDate)}`;

  const untilStart = daysBetween(today, start);

  if (untilStart > 0) {
    return {
      range,
      detail: untilStart === 1 ? "Começa amanhã" : `Começa em ${untilStart} dias`,
      state: "upcoming",
      expired: false,
    };
  }

  if (end && daysBetween(today, end) < 0) {
    return {
      range,
      detail: `Terminou há ${spanLabel(end, today)}`,
      state: "ended",
      expired: contract.status === "ACTIVE",
    };
  }

  const elapsed = untilStart === 0 ? "Começou hoje" : `Em vigência há ${spanLabel(start, today)}`;
  const remaining = end ? remainingLabel(today, end) : "sem data de fim";

  return { range, detail: `${elapsed} · ${remaining}`, state: "running", expired: false };
}
