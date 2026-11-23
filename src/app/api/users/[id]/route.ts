import { jsonError, jsonOk } from "@/lib/http/api-response";
import { readJsonBody } from "@/lib/http/request-body";
import { assertGestor } from "@/lib/auth/require-gestor";
import { getAuthContextFromHeaders } from "@/lib/auth/request-context";
import { userService } from "@/services/user.service";
import { toUserSummary, type UpdateUserInput } from "@/types/user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/users/:id - busca um usuário ativo pelo id (o técnico não recebe o custo/hora).
// PUT /api/users/:id - atualiza dados, custo/hora, situação ou senha (só gestor).

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const user = await userService.getUserById(id);
    return jsonOk({ user: auth.role === "GESTOR" || auth.userId === id ? user : toUserSummary(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertGestor(request);
    const actor = getAuthContextFromHeaders(request);
    const { id } = await context.params;
    const body = await readJsonBody<UpdateUserInput>(request);
    const user = await userService.updateUser(id, body, actor);

    return jsonOk({ user });
  } catch (error) {
    return jsonError(error);
  }
}
