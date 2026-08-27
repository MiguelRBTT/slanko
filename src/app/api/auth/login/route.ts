import { jsonError, jsonOk } from "@/lib/http/api-response";
import { authService } from "@/services/auth.service";
import type { LoginInput } from "@/types/auth";

// POST /api/auth/login - authenticate with email and password, returns JWT.

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginInput;
    const result = await authService.login(body);

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
