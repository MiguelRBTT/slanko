import type { Role } from "@prisma/client";
import { UnauthorizedError } from "@/lib/errors/app-error";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import type { AuthContext } from "@/types/auth";

export function getAuthContextFromHeaders(request: Request): AuthContext {
  const userId = request.headers.get(USER_ID_HEADER);
  const email = request.headers.get(USER_EMAIL_HEADER);
  const role = request.headers.get(USER_ROLE_HEADER) as Role | null;

  if (!userId || !email || !role) {
    throw new UnauthorizedError("Missing auth context");
  }

  return { userId, email, role };
}
