const MS_PER_DAY = 86_400_000;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toNumeric(value: { toString(): string } | number | string): number {
  return typeof value === "number" ? value : Number(value.toString());
}

export function formatMoney(value: number): string {
  return roundMoney(value).toFixed(2);
}

export function calculateEntryCost(hours: number, hourlyCost: number): number {
  return roundMoney(hours * hourlyCost);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function startOfNextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function daysBetween(start: Date, endExclusive: Date): number {
  return Math.round((endExclusive.getTime() - start.getTime()) / MS_PER_DAY);
}

export type RevenueWindow = {
  /** Primeiro dia (UTC) com receita reconhecida. */
  start: Date;
  /** Último dia (UTC, inclusivo) com receita reconhecida. */
  end: Date;
};

/**
 * Janela em que o contrato gera receita: vigência do contrato ∩ período consultado,
 * limitada ao dia de hoje (receita só é reconhecida por dias já decorridos).
 * Retorna null quando não há interseção.
 */
export function resolveRevenueWindow(input: {
  contractStart: Date;
  contractEnd: Date | null;
  periodStart?: Date;
  periodEnd?: Date;
  today: Date;
}): RevenueWindow | null {
  const candidatesStart = [input.contractStart, input.periodStart].filter(
    (value): value is Date => value instanceof Date,
  );
  const candidatesEnd = [input.contractEnd, input.periodEnd, input.today].filter(
    (value): value is Date => value instanceof Date,
  );

  const start = startOfUtcDay(new Date(Math.max(...candidatesStart.map((d) => d.getTime()))));
  const end = startOfUtcDay(new Date(Math.min(...candidatesEnd.map((d) => d.getTime()))));

  if (end < start) {
    return null;
  }

  return { start, end };
}

/**
 * Receita proporcional de um contrato com valor mensal: para cada mês do intervalo,
 * soma valorMensal × (dias do mês dentro da janela / dias do mês).
 * Meses inteiros contam exatamente o valor mensal.
 */
export function calculateProratedRevenue(monthlyValue: number, window: RevenueWindow | null): number {
  if (!window || monthlyValue <= 0) {
    return 0;
  }

  const endExclusive = addUtcDays(window.end, 1);
  let cursor = window.start;
  let revenue = 0;

  while (cursor < endExclusive) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const nextMonth = startOfNextUtcMonth(cursor);
    const sliceEnd = nextMonth < endExclusive ? nextMonth : endExclusive;
    const daysInMonth = daysBetween(monthStart, nextMonth);
    const coveredDays = daysBetween(cursor, sliceEnd);

    revenue += (monthlyValue * coveredDays) / daysInMonth;
    cursor = sliceEnd;
  }

  return roundMoney(revenue);
}

export function calculateContractProfitability(input: {
  contractValue: number;
  revenue: number;
  totalHours: number;
  totalCost: number;
}) {
  const margin = roundMoney(input.revenue - input.totalCost);
  const marginRate = input.revenue > 0 ? roundMoney((margin / input.revenue) * 100) : null;

  return {
    contractValue: formatMoney(input.contractValue),
    revenue: formatMoney(input.revenue),
    totalHours: formatMoney(input.totalHours),
    totalCost: formatMoney(input.totalCost),
    margin: formatMoney(margin),
    marginRate,
    deficitary: margin < 0,
  };
}

export function buildProfitabilityTotals(
  contracts: Array<{
    contractValue: string;
    revenue: string;
    totalHours: string;
    totalCost: string;
    margin: string;
    deficitary: boolean;
  }>,
) {
  let totalContractValue = 0;
  let totalRevenue = 0;
  let totalHours = 0;
  let totalCost = 0;
  let totalMargin = 0;
  let deficitaryContracts = 0;

  for (const contract of contracts) {
    totalContractValue += toNumeric(contract.contractValue);
    totalRevenue += toNumeric(contract.revenue);
    totalHours += toNumeric(contract.totalHours);
    totalCost += toNumeric(contract.totalCost);
    totalMargin += toNumeric(contract.margin);

    if (contract.deficitary) {
      deficitaryContracts += 1;
    }
  }

  return {
    totalContracts: contracts.length,
    deficitaryContracts,
    totalContractValue: formatMoney(totalContractValue),
    totalRevenue: formatMoney(totalRevenue),
    totalHours: formatMoney(totalHours),
    totalCost: formatMoney(totalCost),
    totalMargin: formatMoney(totalMargin),
  };
}
