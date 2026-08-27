import { describe, expect, it } from "vitest";
import { toPublicUser } from "@/types/user";

// Unit tests for user DTO mapping helpers.

describe("toPublicUser", () => {
  it("maps database fields to the public API shape", () => {
    const result = toPublicUser({
      id: "user-1",
      name: "Carlos Tecnico",
      email: "tecnico@slanko.local",
      role: "TECNICO",
      hourlyCost: { toString: () => "85.50" },
      active: true,
    });

    expect(result).toEqual({
      id: "user-1",
      name: "Carlos Tecnico",
      email: "tecnico@slanko.local",
      role: "TECNICO",
      hourlyCost: "85.50",
      active: true,
    });
  });
});
