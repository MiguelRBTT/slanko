import type { Role } from "@prisma/client";
import { ForbiddenError } from "@/lib/errors/app-error";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";

export function assertGestor(request: Request): void {
  const auth = getAuthContextFromHeaders(request);

  if (auth.role !== "GESTOR") {
    throw new ForbiddenError("Insufficient permissions");
  }
}

export function requireRole(request: Request, allowed: Role[]): void {
  const auth = getAuthContextFromHeaders(request);

  if (!allowed.includes(auth.role)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}
