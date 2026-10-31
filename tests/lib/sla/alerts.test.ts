import { describe, expect, it } from "vitest";
import { slaAlertReasons } from "@/lib/sla/alerts";

describe("SLA alerts (RF13)", () => {
  it("does not alert a healthy contract or one without measured tickets", () => {
    expect(
      slaAlertReasons({ responseComplianceRate: 95, resolutionComplianceRate: 80, breachedTickets: 2 }),
    ).toEqual([]);
    expect(
      slaAlertReasons({ responseComplianceRate: null, resolutionComplianceRate: null, breachedTickets: 0 }),
    ).toEqual([]);
  });

  it("alerts compliance below 80% and three or more breached tickets", () => {
    expect(
      slaAlertReasons({ responseComplianceRate: 79.99, resolutionComplianceRate: 50, breachedTickets: 3 }),
    ).toEqual(["LOW_RESPONSE_COMPLIANCE", "LOW_RESOLUTION_COMPLIANCE", "RECURRING_BREACHES"]);
  });
});
