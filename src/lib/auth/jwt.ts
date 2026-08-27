import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import type { AuthContext, JwtClaims } from "@/types/auth";
import { UnauthorizedError } from "@/lib/errors/app-error";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "8h";
}

export async function signAccessToken(input: {
  userId: string;
  email: string;
  role: Role;
}): Promise<string> {
  return new SignJWT({ email: input.email, role: input.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(getJwtExpiresIn())
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const claims = payload as JwtClaims;

    if (!claims.sub || !claims.email || !claims.role) {
      throw new UnauthorizedError("Invalid token");
    }

    return {
      userId: claims.sub,
      email: claims.email,
      role: claims.role,
    };
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}
