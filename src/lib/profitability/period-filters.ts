import { parseDateOnly } from "@/lib/validation/fields";

export function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

export function parseProfitabilityPeriodFilters(searchParams: URLSearchParams) {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  return {
    ...(startDate ? { workedFrom: parseDateOnly(startDate, "startDate") } : {}),
    ...(endDate ? { workedTo: endOfUtcDay(parseDateOnly(endDate, "endDate")) } : {}),
  };
}
