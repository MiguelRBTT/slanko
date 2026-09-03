import { describe, expect, it } from "vitest";
import { toPublicTimeEntry } from "@/types/time-entry";

describe("toPublicTimeEntry", () => {
  it("maps time entry fields to the public shape", () => {
    const entry = toPublicTimeEntry({
      id: "entry-1",
      ticketId: "ticket-1",
      userId: "user-1",
      hours: { toString: () => "2.50" },
      note: "Diagnostico inicial",
      workedAt: new Date("2026-08-19T14:00:00.000Z"),
    });

    expect(entry.hours).toBe("2.50");
    expect(entry.workedAt).toBe("2026-08-19T14:00:00.000Z");
  });
});
