import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { assertGestor } from "@/lib/auth/require-gestor";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { userService } from "@/services/user.service";
import { toUserSummary, type CreateUserInput } from "@/types/user";

// GET /api/users - list active users (JWT). Tecnico receives no hourly cost; includeInactive=true is gestor only.
// POST /api/users - create a user (gestor only).

export async function GET(request: Request) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { searchParams } = new URL(request.url);

    if (searchParams.get("includeInactive") === "true") {
      assertGestor(request);
      return jsonOk({ users: await userService.listAllUsers() });
    }

    const users = await userService.listActiveUsers();
    return jsonOk({ users: auth.role === "GESTOR" ? users : users.map(toUserSummary) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertGestor(request);
    const body = await readJsonBody<CreateUserInput>(request);
    const user = await userService.createUser(body);

    return jsonOk({ user }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
