import { describe, expect, it } from "vitest";
import {
  formatSlaDeadlineLabel,
  formatSlaDuration,
  getActiveSlaDeadline,
} from "@/lib/sla/deadline";

describe("getActiveSlaDeadline", () => {
  const openedAt = new Date("2026-08-19T10:00:00.000Z");

  it("tracks response SLA until the first response", () => {
    const deadline = getActiveSlaDeadline({
      openedAt,
      firstResponseAt: null,
      resolvedAt: null,
      status: "OPEN",
      responseMinutes: 60,
      resolutionMinutes: 480,
      now: new Date("2026-08-19T10:30:00.000Z"),
    });

    expect(deadline).toEqual({
      kind: "response",
      targetMinutes: 60,
      elapsedMinutes: 30,
      remainingMinutes: 30,
      tone: "ok",
    });
  });

  it("turns warn when 10% or less remains", () => {
    const deadline = getActiveSlaDeadline({
      openedAt,
      firstResponseAt: null,
      resolvedAt: null,
      status: "OPEN",
      responseMinutes: 60,
      resolutionMinutes: 480,
      now: new Date("2026-08-19T10:55:00.000Z"),
    });

    expect(deadline?.remainingMinutes).toBe(5);
    expect(deadline?.tone).toBe("warn");
  });

  it("turns breached when the deadline has passed", () => {
    const deadline = getActiveSlaDeadline({
      openedAt,
      firstResponseAt: null,
      resolvedAt: null,
      status: "OPEN",
      responseMinutes: 60,
      resolutionMinutes: 480,
      now: new Date("2026-08-19T11:10:00.000Z"),
    });

    expect(deadline?.remainingMinutes).toBe(-10);
    expect(deadline?.tone).toBe("breached");
  });

  it("switches to resolution SLA after the first response", () => {
    const deadline = getActiveSlaDeadline({
      openedAt,
      firstResponseAt: new Date("2026-08-19T10:20:00.000Z"),
      resolvedAt: null,
      status: "IN_PROGRESS",
      responseMinutes: 60,
      resolutionMinutes: 480,
      now: new Date("2026-08-19T14:00:00.000Z"),
    });

    expect(deadline?.kind).toBe("resolution");
    expect(deadline?.elapsedMinutes).toBe(240);
    expect(deadline?.remainingMinutes).toBe(240);
    expect(deadline?.tone).toBe("ok");
  });

  it("returns null for resolved or closed tickets", () => {
    expect(
      getActiveSlaDeadline({
        openedAt,
        firstResponseAt: new Date("2026-08-19T10:20:00.000Z"),
        resolvedAt: new Date("2026-08-19T12:00:00.000Z"),
        status: "RESOLVED",
        responseMinutes: 60,
        resolutionMinutes: 480,
      }),
    ).toBeNull();

    expect(
      getActiveSlaDeadline({
        openedAt,
        firstResponseAt: null,
        resolvedAt: null,
        status: "CLOSED",
        responseMinutes: 60,
        resolutionMinutes: 480,
      }),
    ).toBeNull();
  });
});

describe("formatSlaDeadlineLabel", () => {
  it("formats remaining and breached labels", () => {
    expect(
      formatSlaDeadlineLabel({
        kind: "response",
        targetMinutes: 60,
        elapsedMinutes: 30,
        remainingMinutes: 30,
        tone: "ok",
      }),
    ).toBe("SLA de resposta: restam 30 min");

    expect(
      formatSlaDeadlineLabel({
        kind: "resolution",
        targetMinutes: 480,
        elapsedMinutes: 500,
        remainingMinutes: -20,
        tone: "breached",
      }),
    ).toBe("SLA de resolução estourado há 20 min");
  });

  it("formats longer durations", () => {
    expect(formatSlaDuration(90)).toBe("1 h 30 min");
    expect(formatSlaDuration(120)).toBe("2 h");
  });
});
