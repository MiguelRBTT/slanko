import { describe, expect, it } from "vitest";
import { endOfUtcDay, parseSlaPeriodFilters } from "@/lib/sla/period-filters";

describe("parseSlaPeriodFilters", () => {
  it("parses optional start and end dates", () => {
    const filters = parseSlaPeriodFilters(
      new URLSearchParams("startDate=2026-08-01&endDate=2026-08-31"),
    );

    expect(filters.openedFrom?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(filters.openedTo?.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("returns an empty object without period filters", () => {
    expect(parseSlaPeriodFilters(new URLSearchParams())).toEqual({});
  });

  it("builds the end of a UTC day", () => {
    expect(endOfUtcDay(new Date("2026-08-31T00:00:00.000Z")).toISOString()).toBe(
      "2026-08-31T23:59:59.999Z",
    );
  });
});
