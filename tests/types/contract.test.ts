import { describe, expect, it } from "vitest";
import { toPublicContract } from "@/types/contract";

describe("toPublicContract", () => {
  it("maps database fields including endDate", () => {
    expect(
      toPublicContract({
        id: "contract-1",
        clientId: "client-1",
        code: "CTR-2026-001",
        title: "Suporte mensal",
        description: "Descricao",
        value: { toString: () => "4500.00" },
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
        status: "ACTIVE",
        responseMinutes: 60,
        resolutionMinutes: 480,
      }),
    ).toEqual({
      id: "contract-1",
      clientId: "client-1",
      code: "CTR-2026-001",
      title: "Suporte mensal",
      description: "Descricao",
      value: "4500.00",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "ACTIVE",
      responseMinutes: 60,
      resolutionMinutes: 480,
    });
  });

  it("maps null endDate", () => {
    const result = toPublicContract({
      id: "contract-2",
      clientId: "client-1",
      code: "CTR-2026-002",
      title: "Suporte premium",
      description: null,
      value: { toString: () => "6000" },
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: null,
      status: "DRAFT",
      responseMinutes: 30,
      resolutionMinutes: 240,
    });

    expect(result.endDate).toBeNull();
  });
});
