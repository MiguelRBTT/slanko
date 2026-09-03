import { describe, expect, it } from "vitest";
import { toPublicClient } from "@/types/client";

describe("toPublicClient", () => {
  it("maps database fields to the public API shape", () => {
    expect(
      toPublicClient({
        id: "client-1",
        name: "Tech Solutions Ltda",
        document: "12.345.678/0001-90",
        email: "contato@techsolutions.local",
        phone: "(48) 99999-0000",
        active: true,
      }),
    ).toEqual({
      id: "client-1",
      name: "Tech Solutions Ltda",
      document: "12.345.678/0001-90",
      email: "contato@techsolutions.local",
      phone: "(48) 99999-0000",
      active: true,
    });
  });
});
