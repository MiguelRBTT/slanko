import { describe, expect, it } from "vitest";
import { assertGestor, requireRole } from "@/lib/auth/require-gestor";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";

function requestWithRole(role: string) {
  return new Request("http://localhost/api/contracts", {
    headers: {
      [USER_ID_HEADER]: "user-1",
      [USER_EMAIL_HEADER]: "user@slanko.local",
      [USER_ROLE_HEADER]: role,
    },
  });
}

describe("require-gestor helpers", () => {
  it("allows gestor", () => {
    expect(() => assertGestor(requestWithRole("GESTOR"))).not.toThrow();
  });

  it("blocks tecnico", () => {
    expect(() => assertGestor(requestWithRole("TECNICO"))).toThrow(ForbiddenError);
  });

  it("requireRole accepts allowed roles", () => {
    expect(() => requireRole(requestWithRole("TECNICO"), ["TECNICO", "GESTOR"])).not.toThrow();
  });

  it("requireRole rejects disallowed roles", () => {
    expect(() => requireRole(requestWithRole("TECNICO"), ["GESTOR"])).toThrow(ForbiddenError);
  });

  it("throws when auth headers are missing", () => {
    expect(() => assertGestor(new Request("http://localhost"))).toThrow(UnauthorizedError);
  });
});
