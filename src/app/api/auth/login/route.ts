import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { UnauthorizedError } from "@/lib/errors/app-error";
import {
  clientIp,
  LoginRateLimiter,
  loginRateLimiter,
  TooManyRequestsError,
} from "@/lib/auth/login-rate-limit";
import { recordLoginAttempt } from "@/lib/observability/metrics";
import { authService } from "@/services/auth.service";
import type { LoginInput } from "@/types/auth";

// POST /api/auth/login - authenticate with email and password, returns JWT.
// Após 5 falhas para o mesmo email (e IP, atrás de proxy confiável) em 15 min, responde 429 com Retry-After.

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<LoginInput>(request);
    const key = LoginRateLimiter.key(clientIp(request), typeof body.email === "string" ? body.email : "");

    loginRateLimiter.assertAllowed(key);

    try {
      const result = await authService.login(body);
      loginRateLimiter.reset(key);
      recordLoginAttempt("success");
      return jsonOk(result);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        loginRateLimiter.recordFailure(key);
        recordLoginAttempt("failure");
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      recordLoginAttempt("blocked");
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    return jsonError(error);
  }
}
