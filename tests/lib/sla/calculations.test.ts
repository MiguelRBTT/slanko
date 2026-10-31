import { describe, expect, it } from "vitest";
import {
  buildSlaCounters,
  complianceRate,
  evaluateResolutionSla,
  evaluateResponseSla,
  minutesBetween,
} from "@/lib/sla/calculations";

describe("sla calculations", () => {
  const openedAt = new Date("2026-08-19T10:00:00.000Z");

  it("calculates minutes between dates", () => {
    expect(minutesBetween(openedAt, new Date("2026-08-19T10:30:00.000Z"))).toBe(30);
  });

  it("evaluates response SLA as pending, met or breached", () => {
    expect(
      evaluateResponseSla({
        openedAt,
        firstResponseAt: null,
        targetMinutes: 60,
        now: new Date("2026-08-19T10:45:00.000Z"),
      }).status,
    ).toBe("PENDING");

    expect(
      evaluateResponseSla({
        openedAt,
        firstResponseAt: new Date("2026-08-19T10:30:00.000Z"),
        targetMinutes: 60,
      }).status,
    ).toBe("MET");

    expect(
      evaluateResponseSla({
        openedAt,
        firstResponseAt: new Date("2026-08-19T11:30:00.000Z"),
        targetMinutes: 60,
      }).status,
    ).toBe("BREACHED");
  });

  it("evaluates resolution SLA as pending, met or breached", () => {
    expect(
      evaluateResolutionSla({
        openedAt,
        resolvedAt: null,
        targetMinutes: 480,
        now: new Date("2026-08-19T12:00:00.000Z"),
      }).status,
    ).toBe("PENDING");

    expect(
      evaluateResolutionSla({
        openedAt,
        resolvedAt: new Date("2026-08-19T14:00:00.000Z"),
        targetMinutes: 480,
      }).status,
    ).toBe("MET");

    expect(
      evaluateResolutionSla({
        openedAt,
        resolvedAt: new Date("2026-08-20T10:00:00.000Z"),
        targetMinutes: 480,
      }).status,
    ).toBe("BREACHED");
  });

  it("treats a missing response or resolution past the deadline as breached", () => {
    const response = evaluateResponseSla({
      openedAt,
      firstResponseAt: null,
      targetMinutes: 60,
      now: new Date("2026-08-19T11:30:00.000Z"),
    });

    expect(response.status).toBe("BREACHED");
    expect(response.elapsedMinutes).toBe(90);

    const resolution = evaluateResolutionSla({
      openedAt,
      resolvedAt: null,
      targetMinutes: 480,
      now: new Date("2026-08-20T10:00:00.000Z"),
    });

    expect(resolution.status).toBe("BREACHED");
    expect(resolution.elapsedMinutes).toBe(1440);
  });

  it("keeps the deadline minute itself within the SLA", () => {
    expect(
      evaluateResponseSla({
        openedAt,
        firstResponseAt: null,
        targetMinutes: 60,
        now: new Date("2026-08-19T11:00:00.000Z"),
      }).status,
    ).toBe("PENDING");
  });

  it("builds SLA counters and compliance rates", () => {
    const counters = buildSlaCounters([
      {
        response: { status: "MET", elapsedMinutes: 30, targetMinutes: 60 },
        resolution: { status: "PENDING", elapsedMinutes: null, targetMinutes: 480 },
      },
      {
        response: { status: "PENDING", elapsedMinutes: null, targetMinutes: 60 },
        resolution: { status: "BREACHED", elapsedMinutes: 600, targetMinutes: 480 },
      },
      {
        response: { status: "BREACHED", elapsedMinutes: 90, targetMinutes: 60 },
        resolution: { status: "PENDING", elapsedMinutes: null, targetMinutes: 480 },
      },
    ]);

    expect(counters.totalTickets).toBe(3);
    expect(counters.response.complianceRate).toBe(50);
    expect(counters.response.pending).toBe(1);
    expect(counters.response.breached).toBe(1);
    expect(counters.resolution.pending).toBe(2);
    expect(counters.resolution.breached).toBe(1);
  });

  it("returns null compliance rate when nothing was evaluated", () => {
    expect(complianceRate(0, 0)).toBeNull();
  });
});
