import { describe, expect, it } from "vitest";
import {
  assertRoleAllowed,
  authenticateAuthorizationHeader,
  isProtectedApiPath,
  isPublicApiPath,
  requiresGestorRole,
} from "@/lib/auth/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";
import { signAccessToken } from "@/lib/auth/jwt";

describe("authorize helpers", () => {
  it("identifies public and protected API paths", () => {
    expect(isPublicApiPath("/api/health")).toBe(true);
    expect(isPublicApiPath("/api/auth/login")).toBe(true);
    expect(isProtectedApiPath("/api/users")).toBe(true);
    expect(isProtectedApiPath("/api/clients")).toBe(true);
    expect(isProtectedApiPath("/api/health")).toBe(false);
  });

  it("requires gestor role for client routes", () => {
    expect(requiresGestorRole("/api/clients")).toBe(true);
    expect(requiresGestorRole("/api/users")).toBe(false);
  });

  it("allows gestor on client routes", () => {
    expect(() => assertRoleAllowed("/api/clients", "GESTOR")).not.toThrow();
  });

  it("blocks tecnico on client routes", () => {
    expect(() => assertRoleAllowed("/api/clients", "TECNICO")).toThrow(ForbiddenError);
  });

  it("authenticates a valid bearer token", async () => {
    const token = await signAccessToken({
      userId: "user-1",
      email: "gestor@slanko.local",
      role: "GESTOR",
    });

    const authContext = await authenticateAuthorizationHeader(`Bearer ${token}`, "/api/users");

    expect(authContext.userId).toBe("user-1");
  });

  it("rejects missing bearer tokens", async () => {
    await expect(authenticateAuthorizationHeader(null, "/api/users")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
