import { describe, expect, it } from "vitest";
import {
  labelContractStatus,
  labelSlaCheck,
  labelTicketPriority,
  labelTicketStatus,
} from "@/lib/client/labels";

describe("label helpers", () => {
  it("translates ticket and contract enums", () => {
    expect(labelTicketStatus("RESOLVED")).toBe("Resolvido");
    expect(labelTicketStatus("CLOSED")).toBe("Encerrado");
    expect(labelTicketPriority("HIGH")).toBe("Alta");
    expect(labelContractStatus("ACTIVE")).toBe("Ativo");
  });

  it("translates SLA check statuses without informal ok", () => {
    expect(labelSlaCheck("MET")).toBe("Cumprido");
    expect(labelSlaCheck("OK")).toBe("Cumprido");
    expect(labelSlaCheck("BREACHED")).toBe("Violado");
    expect(labelSlaCheck("PENDING")).toBe("Pendente");
  });
});
