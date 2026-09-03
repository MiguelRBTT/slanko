import { BadRequestError } from "@/lib/errors/app-error";

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${field} is required`);
  }

  return value.trim();
}

export function optionalNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BadRequestError("Invalid string value");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parsePositiveNumber(value: unknown, field: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;

  if (typeof parsed !== "number" || Number.isNaN(parsed) || parsed <= 0) {
    throw new BadRequestError(`${field} must be a positive number`);
  }

  return parsed;
}

export function parsePositiveInteger(value: unknown, field: string): number {
  const parsed = parsePositiveNumber(value, field);

  if (!Number.isInteger(parsed)) {
    throw new BadRequestError(`${field} must be an integer`);
  }

  return parsed;
}

export function parseDateOnly(value: unknown, field: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestError(`${field} must be a date in YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${field} is invalid`);
  }

  return date;
}

export function parseOptionalDateOnly(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseDateOnly(value, field);
}

export function assertEndDateAfterStartDate(startDate: Date, endDate: Date | null | undefined): void {
  if (endDate && endDate < startDate) {
    throw new BadRequestError("endDate must be on or after startDate");
  }
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
