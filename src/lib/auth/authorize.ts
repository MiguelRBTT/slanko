import type { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";
import {
  GESTOR_ONLY_API_PREFIXES,
  PROTECTED_API_PREFIXES,
  PUBLIC_API_PATHS,
} from "@/lib/auth/constants";
import { extractBearerToken, verifyAccessToken } from "@/lib/auth/jwt";
import { userRepository } from "@/repositories/user.repository";
import type { AuthContext } from "@/types/auth";

export type AuthUserLookup = (
  userId: string,
) => Promise<{ id: string; email: string; role: Role; active: boolean } | null>;

const findUserById: AuthUserLookup = (userId) => userRepository.findById(userId);

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

/**
 * Valida o JWT e confere o usuário no banco a cada requisição: quem foi desativado perde
 * o acesso na hora (sem esperar o token expirar) e mudanças de perfil valem imediatamente.
 */
export async function authenticateAuthorizationHeader(
  authorizationHeader: string | null,
  pathname: string,
  findUser: AuthUserLookup = findUserById,
): Promise<AuthContext> {
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const claims = await verifyAccessToken(token);
  const user = await findUser(claims.userId);

  if (!user || !user.active) {
    throw new UnauthorizedError("User not found or inactive");
  }

  const authContext: AuthContext = { userId: user.id, email: user.email, role: user.role };
  assertRoleAllowed(pathname, authContext.role);

  return authContext;
}

export async function authenticateRequest(
  authorizationHeader: string | null,
  pathname: string,
  findUser?: AuthUserLookup,
): Promise<AuthContext | null> {
  if (!isProtectedApiPath(pathname)) {
    return null;
  }

  return authenticateAuthorizationHeader(authorizationHeader, pathname, findUser);
}
