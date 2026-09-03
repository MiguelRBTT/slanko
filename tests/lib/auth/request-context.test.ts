import { describe, expect, it } from "vitest";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { UnauthorizedError } from "@/lib/errors/app-error";

describe("getAuthContextFromHeaders", () => {
  it("returns auth context from middleware headers", () => {
    const request = new Request("http://localhost/api/tickets", {
      headers: {
        [USER_ID_HEADER]: "user-1",
        [USER_EMAIL_HEADER]: "gestor@slanko.local",
        [USER_ROLE_HEADER]: "GESTOR",
      },
    });

    const auth = getAuthContextFromHeaders(request);

    expect(auth).toEqual({
      userId: "user-1",
      email: "gestor@slanko.local",
      role: "GESTOR",
    });
  });

  it("throws when auth headers are missing", () => {
    const request = new Request("http://localhost/api/tickets");

    expect(() => getAuthContextFromHeaders(request)).toThrow(UnauthorizedError);
  });
});
