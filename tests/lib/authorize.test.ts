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
    expect(isPublicApiPath("/api/metrics")).toBe(true);
    expect(isProtectedApiPath("/api/users")).toBe(true);
    expect(isProtectedApiPath("/api/clients")).toBe(true);
    expect(isProtectedApiPath("/api/tickets")).toBe(true);
    expect(isProtectedApiPath("/api/health")).toBe(false);
  });

  it("requires gestor role for client routes", () => {
    expect(requiresGestorRole("/api/clients")).toBe(true);
    expect(requiresGestorRole("/api/sla")).toBe(true);
    expect(requiresGestorRole("/api/profitability")).toBe(true);
    expect(requiresGestorRole("/api/contracts")).toBe(false);
    expect(requiresGestorRole("/api/tickets")).toBe(false);
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

    const authContext = await authenticateAuthorizationHeader(`Bearer ${token}`, "/api/users", async () => ({
      id: "user-1",
      email: "gestor@slanko.local",
      role: "GESTOR",
      active: true,
    }));

    expect(authContext.userId).toBe("user-1");
  });

  it("rejects tokens of users that were deactivated or removed", async () => {
    const token = await signAccessToken({ userId: "user-1", email: "a@slanko.local", role: "GESTOR" });

    await expect(
      authenticateAuthorizationHeader(`Bearer ${token}`, "/api/users", async () => ({
        id: "user-1",
        email: "a@slanko.local",
        role: "GESTOR",
        active: false,
      })),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(
      authenticateAuthorizationHeader(`Bearer ${token}`, "/api/users", async () => null),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("uses the current role from the database, not the role inside the token", async () => {
    const token = await signAccessToken({ userId: "user-1", email: "a@slanko.local", role: "GESTOR" });

    // Gestor rebaixado a técnico perde acesso às rotas de gestor imediatamente.
    await expect(
      authenticateAuthorizationHeader(`Bearer ${token}`, "/api/clients", async () => ({
        id: "user-1",
        email: "a@slanko.local",
        role: "TECNICO",
        active: true,
      })),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects missing bearer tokens", async () => {
    await expect(authenticateAuthorizationHeader(null, "/api/users")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
