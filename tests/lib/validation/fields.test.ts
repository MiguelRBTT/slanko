import { describe, expect, it } from "vitest";
import {
  assertEndDateAfterStartDate,
  isUniqueConstraintError,
  optionalNullableString,
  parseDateOnly,
  parseDateTime,
  parseOptionalDateOnly,
  parsePositiveInteger,
  parsePositiveNumber,
  requireNonEmptyString,
} from "@/lib/validation/fields";
import { BadRequestError } from "@/lib/errors/app-error";

describe("validation fields", () => {
  it("requireNonEmptyString trims and validates input", () => {
    expect(requireNonEmptyString("  Slanko  ", "name")).toBe("Slanko");
  });

  it("requireNonEmptyString rejects empty values", () => {
    expect(() => requireNonEmptyString("   ", "name")).toThrow(BadRequestError);
    expect(() => requireNonEmptyString(123, "name")).toThrow(BadRequestError);
  });

  it("optionalNullableString handles undefined, null and strings", () => {
    expect(optionalNullableString(undefined)).toBeUndefined();
    expect(optionalNullableString(null)).toBeNull();
    expect(optionalNullableString("  abc  ")).toBe("abc");
    expect(optionalNullableString("   ")).toBeNull();
    expect(() => optionalNullableString(10)).toThrow(BadRequestError);
  });

  it("parsePositiveNumber accepts numbers and numeric strings", () => {
    expect(parsePositiveNumber(10, "value")).toBe(10);
    expect(parsePositiveNumber("12.5", "value")).toBe(12.5);
  });

  it("parsePositiveNumber rejects invalid values", () => {
    expect(() => parsePositiveNumber(0, "value")).toThrow(BadRequestError);
    expect(() => parsePositiveNumber("abc", "value")).toThrow(BadRequestError);
  });

  it("parsePositiveInteger rejects decimal numbers", () => {
    expect(() => parsePositiveInteger(1.5, "minutes")).toThrow(BadRequestError);
  });

  it("parseDateOnly validates YYYY-MM-DD dates", () => {
    const date = parseDateOnly("2026-09-01", "startDate");
    expect(date.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(() => parseDateOnly("2026/09/01", "startDate")).toThrow(BadRequestError);
    expect(() => parseDateOnly("2026-99-99", "startDate")).toThrow(BadRequestError);
  });

  it("parseDateTime validates ISO datetimes", () => {
    const date = parseDateTime("2026-08-19T14:00:00.000Z", "workedAt");
    expect(date.toISOString()).toBe("2026-08-19T14:00:00.000Z");
    expect(() => parseDateTime("invalid", "workedAt")).toThrow(BadRequestError);
  });

  it("parseOptionalDateOnly handles optional date values", () => {
    expect(parseOptionalDateOnly(undefined, "endDate")).toBeUndefined();
    expect(parseOptionalDateOnly(null, "endDate")).toBeNull();
    expect(parseOptionalDateOnly("2026-12-31", "endDate")).toBeInstanceOf(Date);
  });

  it("assertEndDateAfterStartDate validates date order", () => {
    const start = parseDateOnly("2026-09-01", "startDate");
    const end = parseDateOnly("2026-12-31", "endDate");

    expect(() => assertEndDateAfterStartDate(start, end)).not.toThrow();
    expect(() => assertEndDateAfterStartDate(start, null)).not.toThrow();
    expect(() => assertEndDateAfterStartDate(end, start)).toThrow(BadRequestError);
  });

  it("isUniqueConstraintError detects Prisma unique violations", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isUniqueConstraintError(new Error("other"))).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });
});
