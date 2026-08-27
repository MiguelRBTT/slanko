import type { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";
import {
  GESTOR_ONLY_API_PREFIXES,
  PROTECTED_API_PREFIXES,
  PUBLIC_API_PATHS,
} from "@/lib/auth/constants";
import { extractBearerToken, verifyAccessToken } from "@/lib/auth/jwt";
import type { AuthContext } from "@/types/auth";

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function requiresGestorRole(pathname: string): boolean {
  return GESTOR_ONLY_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function assertRoleAllowed(pathname: string, role: Role): void {
  if (requiresGestorRole(pathname) && role !== "GESTOR") {
    throw new ForbiddenError("Insufficient permissions");
  }
}

export async function authenticateAuthorizationHeader(
  authorizationHeader: string | null,
  pathname: string,
): Promise<AuthContext> {
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const authContext = await verifyAccessToken(token);
  assertRoleAllowed(pathname, authContext.role);

  return authContext;
}

export async function authenticateRequest(
  authorizationHeader: string | null,
  pathname: string,
): Promise<AuthContext | null> {
  if (!isProtectedApiPath(pathname)) {
    return null;
  }

  return authenticateAuthorizationHeader(authorizationHeader, pathname);
}
